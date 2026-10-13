const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require("electron")
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const ServerProcess = require("./server_process")

// The client is the junon-io production build for NODE_ENV=standalone
// (`NODE_ENV=standalone npm run client:build`), served from app://junon/.
// A fixed origin keeps the local profile in localStorage stable; serving it
// from the page server on a free port would change the origin, and with it
// the profile that owns the player's worlds.
const CLIENT_DIR = path.join(path.dirname(require.resolve("junon-io/package.json")), "dist")
const APP_ORIGIN = "app://junon"

// the subset of Server#getLocalWorldApi the renderer may call
const LOCAL_WORLD_API_METHODS = ["listWorlds", "createWorld", "openWorld", "hostWorld", "stopHosting", "startTutorial", "listImportCharacters", "importWorld"]

// Separate user-data directories let two instances run side by side on one
// machine, e.g. a co-op host and a guest when testing
if (process.env.JUNON_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.JUNON_USER_DATA_DIR))
}

protocol.registerSchemesAsPrivileged([
  // not `secure`: the page must be allowed to open ws:// sockets to co-op hosts
  { scheme: "app", privileges: { standard: true, supportFetchAPI: true } }
])

let serverProcess
let mainWindow
let isQuitting = false

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

    try {
      return { result: await serverProcess.request(method, args) }
    } catch (e) {
      return { error: e.message }
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000000",
    title: "Junon",
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

  serverProcess = new ServerProcess({
    savesDir: path.join(app.getPath("userData"), "saves"),
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
    serverProcess.stop().finally(() => app.quit())
  })
}
