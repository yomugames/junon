const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require("electron")
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const ServerProcess = require("./server_process")
const SteamRuntime = require("./steam")
const SteamHost = require("./steam_host")
const SteamGuest = require("./steam_guest")
const SteamLobbies = require("./steam_lobby")
const RtcHost = require("./rtc_host")

// The client is the junon-io production build for NODE_ENV=standalone
// (`NODE_ENV=standalone npm run client:build`), served from app://junon/.
// A fixed origin keeps the local profile in localStorage stable; serving it
// from the page server on a free port would change the origin, and with it
// the profile that owns the player's worlds.
const CLIENT_DIR = path.join(path.dirname(require.resolve("junon-io/package.json")), "dist")
const APP_ORIGIN = "app://junon"

// the subset of Server#getLocalWorldApi the renderer may call
const LOCAL_WORLD_API_METHODS = ["listWorlds", "createWorld", "openWorld", "deleteWorld", "hostWorld", "hostWorldOnSteam", "hostWorldOnline", "getHosting", "stopHosting", "startTutorial", "listImportCharacters", "importWorld"]

// The signalling server for online (WebRTC) co-op, packages/junon-signal,
// deployed as a Cloudflare Worker. JUNON_SIGNAL_URL points elsewhere, or
// `off` hides the online co-op controls (the desktop tests use it).
const DEFAULT_SIGNAL_URL = "wss://junon-signal.yomusolutions.workers.dev"
function signalUrl(value) {
  if (value === "off") return null
  return /^wss?:\/\/[^\s]+$/.test(value || "") ? value : DEFAULT_SIGNAL_URL
}
const SIGNAL_URL = signalUrl(process.env.JUNON_SIGNAL_URL)

// Separate user-data directories let two instances run side by side on one
// machine, e.g. a co-op host and a guest when testing
if (process.env.JUNON_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.JUNON_USER_DATA_DIR))
}

// WebRTC co-op: offer guests this machine's real local addresses rather than
// mDNS names, which some networks (and two instances on one machine) can't
// resolve. Peers are friends the host gave a room code, and LAN co-op shows
// these addresses anyway.
app.commandLine.appendSwitch("disable-features", "WebRtcHideLocalIpsWithMdns")

protocol.registerSchemesAsPrivileged([
  // not `secure`: the page must be allowed to open ws:// sockets to co-op hosts
  { scheme: "app", privileges: { standard: true, supportFetchAPI: true } }
])

let serverProcess
let mainWindow
let isQuitting = false

// Steam co-op (steam.js); without Steam these stay null
let steam = new SteamRuntime()
let steamHost = null
let steamGuest = null
let steamLobbies = null
// the lobby being created for the current Steam hosting (steamHosting)
let steamLobbyOpening = null

// online co-op (rtc_host.js); null without a signalling server
let rtcHost = null

function isClientBuilt() {
  let indexPath = path.join(CLIENT_DIR, "index.html")
  if (!fs.existsSync(indexPath)) return false

  // a hosted production build would show the matchmaker lobby instead of the
  // local world menu
  return fs.readFileSync(indexPath, "utf8").includes('window.env = "standalone"')
}

function serveClient(request) {
  let url = new URL(request.url)
  if (url.host !== "junon") return new Response("Not found", { status: 404 })

  let filePath = path.normalize(path.join(CLIENT_DIR, decodeURIComponent(url.pathname)))
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + path.sep)) {
    return new Response("Not found", { status: 404 })
  }
  if (url.pathname.endsWith("/")) filePath = path.join(filePath, "index.html")
  if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
    return new Response("Not found", { status: 404 })
  }

  return net.fetch(pathToFileURL(filePath).toString())
}

function isAppFrame(frame) {
  return !!frame && frame.url.startsWith(APP_ORIGIN + "/")
}

function registerIpc() {
  ipcMain.handle("junon:local-world-api", async (event, method, args) => {
    if (!isAppFrame(event.senderFrame)) return { error: "Forbidden" }
    if (!LOCAL_WORLD_API_METHODS.includes(method) || !Array.isArray(args)) return { error: "Unknown request" }
    // the server can't tell whether this process has Steam
    if (method === "hostWorldOnSteam" && !steamHost) return { error: "Steam is not available" }
    if (method === "hostWorldOnline" && !rtcHost) return { error: "Online co-op is not available" }

    try {
      if (method === "hostWorldOnSteam") return { result: await hostWorldOnSteam(args) }
      if (method === "hostWorldOnline") return { result: await hostWorldOnline(args) }
      return { result: await serverProcess.request(method, args) }
    } catch (e) {
      return { error: e.message }
    }
  })

  // Steam co-op for the renderer (preload.js). Without Steam, getStatus says
  // so and the client hides the Steam controls.
  ipcMain.handle("junon:steam-api", async (event, method, args) => {
    if (!isAppFrame(event.senderFrame)) return { error: "Forbidden" }
    if (!Array.isArray(args)) return { error: "Unknown request" }
    if (method === "getStatus") return { result: getSteamStatus() }
    if (!steamLobbies) return { error: "Steam is not available" }

    let api = {
      listFriends: () => steamLobbies.listFriends(),
      listFriendsHosting: () => steamLobbies.listFriendsHosting(),
      invite: (friendSteamId) => steamLobbies.invite(friendSteamId),
      openInviteDialog: () => steamLobbies.openInviteDialog(),
      // resolves to { hostSteamId, worldName }; the renderer then opens a
      // Steam socket to the host
      joinLobby: (lobbyId, protocolHash) => steamLobbies.joinLobby(lobbyId, protocolHash),
      leaveLobby: () => steamLobbies.leaveJoinedLobby()
    }
    if (!Object.prototype.hasOwnProperty.call(api, method)) return { error: "Unknown request" }

    try {
      return { result: await api[method](...args) }
    } catch (e) {
      return { error: e.message }
    }
  })

  // online co-op guests connect from the renderer (client/src/util/rtc_socket.js)
  // and only need to know where the signalling server is
  ipcMain.handle("junon:online-status", (event) => {
    if (!isAppFrame(event.senderFrame)) return { isAvailable: false }
    return { isAvailable: !!SIGNAL_URL, signalUrl: SIGNAL_URL }
  })

  ipcMain.on("junon:rtc-host-event", (event, message) => {
    if (!rtcHost || !rtcHost.isHostWindow(event.sender)) return
    rtcHost.onWindowEvent(message)
  })

  ipcMain.handle("junon:steam-socket-open", (event, hostSteamId, protocolHash) => {
    if (!isAppFrame(event.senderFrame)) return { error: "Forbidden" }
    if (!steamGuest) return { error: "Steam is not available" }

    try {
      return { result: steamGuest.open(event.sender, hostSteamId, protocolHash) }
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.on("junon:steam-socket-send", (event, socketId, kind, data) => {
    if (!isAppFrame(event.senderFrame) || !steamGuest) return
    steamGuest.send(socketId, event.sender, kind, data)
  })

  ipcMain.on("junon:steam-socket-close", (event, socketId) => {
    if (!isAppFrame(event.senderFrame) || !steamGuest) return
    steamGuest.close(socketId, event.sender)
  })
}

// the game server tells main when Steam and online hosting start and stop,
// and relays those guests' frames
function onServerMessage(message) {
  if (rtcHost) {
    if (message.type === "rtcHosting") return rtcHost.setHosting(message)
    if (RtcHost.isServerMessage(message)) return rtcHost.onServerMessage(message)
  }

  if (!steamHost) return
  if (message.type === "steamHosting") return onSteamHosting(message)
  if (SteamHost.isServerMessage(message)) steamHost.onServerMessage(message)
}

// As for Steam: the server sends rtcHosting before it answers, and the room
// code follows from the signalling server. If it can't be had, main has
// already told the server to stop online hosting (rtcHostingFailed).
async function hostWorldOnline(args) {
  let result = await serverProcess.request("hostWorldOnline", args)

  let roomCode = await rtcHost.opening
  if (!roomCode) throw new Error("Hosting ended before the room was ready")

  result.hosting.roomCode = roomCode
  return result
}

// the server starts or ends Steam hosting (Server#startSteamHosting,
// #stopHosting), also when the host switches worlds or quits
function onSteamHosting(message) {
  steamHost.setHosting(!!message.isHosting)

  if (message.isHosting) {
    steamLobbyOpening = steamLobbies.openLobby(message)
    // hostWorldOnSteam reports a failure
    steamLobbyOpening.catch(() => {})
  } else {
    steamLobbyOpening = null
    steamLobbies.closeLobby()
  }
}

// The server sends steamHosting before it answers, so the lobby is on its
// way by then. Without a lobby nobody can join, so hosting is undone.
async function hostWorldOnSteam(args) {
  let result = await serverProcess.request("hostWorldOnSteam", args)

  let lobbyId
  try {
    lobbyId = await steamLobbyOpening
  } catch (e) {
    await serverProcess.request("stopHosting", [])
    throw e
  }
  if (!lobbyId) throw new Error("Hosting ended before the Steam lobby was ready")

  result.hosting.steamLobbyId = lobbyId
  return result
}

// pendingLobbyId: the lobby an invite launched the game to join, reported
// once
function getSteamStatus() {
  let status = steam.getStatus()
  if (steamLobbies) status.pendingLobbyId = steamLobbies.takeLaunchLobby()
  return status
}

function initSteam() {
  if (!steam.init()) return

  steamLobbies = new SteamLobbies(steam, {
    // an invite accepted, or Join Game clicked, while the game runs
    onJoinRequest: (lobbyId) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("junon:steam-join-request", lobbyId)
    }
  })
  steamHost = new SteamHost(steam, (message) => serverProcess.post(message), (steamId) => steamLobbies.isMember(steamId))
  steamGuest = new SteamGuest(steam)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000000",
    title: "Junon",
    // the window and taskbar icon on Linux; Windows uses the exe's
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // the game links to its wiki, Discord and similar sites: open those in the
  // system browser and keep the window on the game
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(APP_ORIGIN + "/")) return
    event.preventDefault()
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })

  // the online co-op host window is hidden, so closing this one is quitting
  mainWindow.on("closed", () => app.quit())

  mainWindow.loadURL(APP_ORIGIN + "/")
}

async function start() {
  if (!isClientBuilt()) {
    dialog.showErrorBox("Junon", "The standalone client is not built. Run `NODE_ENV=standalone npm run client:build` first.")
    app.exit(1)
    return
  }

  protocol.handle("app", serveClient)
  registerIpc()
  initSteam()
  if (SIGNAL_URL) rtcHost = new RtcHost(SIGNAL_URL, (message) => serverProcess.post(message))

  serverProcess = new ServerProcess({
    savesDir: path.join(app.getPath("userData"), "saves"),
    onMessage: onServerMessage,
    onUnexpectedExit: (code) => {
      if (isQuitting) return
      dialog.showErrorBox("Junon", "The game server stopped unexpectedly (code " + code + ").")
      app.exit(1)
    }
  })

  try {
    await serverProcess.start()
  } catch (e) {
    dialog.showErrorBox("Junon", e.message)
    app.exit(1)
    return
  }

  createWindow()
}

// worlds share one saves directory and sqlite file per user-data directory
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(start)

  app.on("window-all-closed", () => app.quit())

  // save the open world before exiting
  app.on("before-quit", (event) => {
    if (isQuitting || !serverProcess) return
    event.preventDefault()
    isQuitting = true
    serverProcess.stop()
      .finally(() => rtcHost && rtcHost.shutdown())
      .finally(() => {
        if (steamLobbies) steamLobbies.shutdown()
        steam.shutdown()
        app.quit()
      })
  })
}
