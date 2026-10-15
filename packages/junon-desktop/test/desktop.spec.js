// Launches the Electron app against a temporary user-data directory: the
// window loads the standalone client from app://, the game server runs in a
// utility process, and the local menu reaches it over the preload API.
// Requires `NODE_ENV=standalone npm run client:build` first; on a Linux machine
// without a display, run under xvfb-run.
const { test, expect, _electron: electron } = require('@playwright/test')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { startSignalBackend } = require('junon-signal/testing')
const WebSocket = require('ws')

const APP_DIR = path.resolve(__dirname, '..')

// software WebGL, so the game renders on machines without a GPU (CI, xvfb)
const CHROMIUM_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']

let userDataDir

test.beforeEach(() => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-desktop-'))
})

test.afterEach(() => {
  fs.rmSync(userDataDir, { recursive: true, force: true })
})

// extraEnv: e.g. a fake Steam (steamEnv)
async function launch(dataDir = userDataDir, extraEnv = {}) {
  const app = await electron.launch({
    args: CHROMIUM_ARGS.concat([APP_DIR]),
    // Steam off, so a machine with Steam running behaves like CI, and online
    // co-op off unless a test runs its own signalling server
    env: Object.assign({}, process.env, { JUNON_USER_DATA_DIR: dataDir, JUNON_STEAM: '0', JUNON_SIGNAL_URL: 'off' }, extraEnv)
  })
  const page = await app.firstWindow()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })
  return { app, page, errors }
}

async function quit(app) {
  const closed = app.waitForEvent('close')
  await app.evaluate(({ app }) => app.quit())
  await closed
}

function savePaths() {
  const savesDir = path.join(userDataDir, 'saves')
  return fs.readdirSync(savesDir)
    .map((entry) => path.join(savesDir, entry, 'sector.sav'))
    .filter((file) => fs.existsSync(file))
}

test('creates a world, saves it on quit and loads it after a restart', async () => {
  let { app, page, errors } = await launch()

  // the page gets the narrow preload API and no Node access
  expect(await page.evaluate(() => [typeof window.junonDesktop, typeof window.require, typeof window.process])).toEqual(['object', 'undefined', 'undefined'])
  expect(await page.evaluate(() => window.junonDesktop.localWorldApi('constructor', []).catch((e) => e.message))).toBe('Unknown request')

  // without Steam, the Steam co-op API says so and refuses to host or connect
  expect(await page.evaluate(() => window.junonDesktop.steam.call('getStatus'))).toEqual({ isAvailable: false })
  expect(await page.evaluate(() => window.junonDesktop.localWorldApi('hostWorldOnSteam', [{}]).catch((e) => e.message))).toBe('Steam is not available')
  expect(await page.evaluate(() => window.junonDesktop.steam.openSocket('76561198000000001', 'abcd1234', {}).catch((e) => e.message))).toBe('Steam is not available')
  // with online co-op off, no signalling server
  expect(await page.evaluate(() => window.junonDesktop.online.getStatus())).toEqual({ isAvailable: false, signalUrl: null })
  expect(await page.evaluate(() => window.junonDesktop.localWorldApi('hostWorldOnline', [{}]).catch((e) => e.message))).toBe('Online co-op is not available')

  await page.click('.local_new_btn')
  await page.fill('.world_name', 'Desktop World')
  await page.selectOption('.world_mode', 'survival')
  await page.click('.create_world')
  await page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
  const worldId = await page.evaluate(() => window.game.sector.uid)

  // singleplayer: the world clock stops while the in-game menu is open
  const clockAdvance = async () => {
    await page.waitForTimeout(300)
    const start = await page.evaluate(() => window.game.timestamp)
    await page.waitForTimeout(1000)
    return (await page.evaluate(() => window.game.timestamp)) - start
  }
  expect(await clockAdvance()).toBeGreaterThan(0)
  // the first Escape may close a menu the game opened on joining
  for (let attempt = 0; attempt < 3 && !(await page.locator('#welcome_container').isVisible()); attempt++) {
    await page.keyboard.press('Escape')
  }
  await expect(page.locator('#welcome_container')).toBeVisible()
  expect(await clockAdvance()).toBe(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('#welcome_container')).toBeHidden()
  expect(await clockAdvance()).toBeGreaterThan(0)

  await quit(app)
  expect(errors).toEqual([])
  expect(savePaths()).toEqual([path.join(userDataDir, 'saves', worldId, 'sector.sav')])

  // a new server port on every launch; the app:// origin, and with it the
  // local profile that owns the world, stays the same
  ;({ app, page, errors } = await launch())
  await expect(page.locator('.local_world_entry')).toHaveText(/Desktop World/)
  await page.click('.local_world_entry')
  await page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
  expect(await page.evaluate(() => window.game.sector.uid)).toBe(worldId)

  await quit(app)
  expect(errors).toEqual([])
})

// prefer a private (LAN or VPN) address, as a friend on the same network
// would use; the loopback address would skip the network path entirely
function pickAddress(addresses) {
  const isPrivate = (address) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(address)
  return addresses.find(isPrivate) || addresses[0] || '127.0.0.1'
}

async function setName(page, name) {
  await page.fill('.local_player_name', name)
  await page.dispatchEvent('.local_player_name', 'change')
}

test('a second instance joins a hosted world, leaves and rejoins', async () => {
  const guestDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-desktop-guest-'))
  const port = 20_000 + Math.floor(Math.random() * 20_000)
  let host
  let guest

  try {
    host = await launch()
    await setName(host.page, 'Host')
    await host.page.evaluate(() => window.junonDesktop.localWorldApi('createWorld', [{ ownerUid: window.main.localProfile.uid, name: 'Coop World', gameMode: 'survival' }]))
    await host.page.click('.local_host_btn')
    await host.page.fill('.host_port', String(port))
    await host.page.fill('.host_password', 'secret')
    await host.page.click('.start_hosting')
    await host.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    await host.page.waitForFunction(() => document.body.innerText.includes('Co-op is open'), null, { timeout: 30_000 })

    // a world thumbnail, which the guest will load from the host
    await host.page.evaluate(() => window.game.screenshot())
    await host.page.waitForFunction(() => Object.keys(window.game.sector.screenshots).length === 1, null, { timeout: 30_000 })

    const status = await host.page.evaluate(() => window.junonDesktop.localWorldApi('listWorlds', []))
    expect(status.hosting).toMatchObject({ port, hasPassword: true })
    const address = pickAddress(status.hosting.addresses) + ':' + port

    const joinAs = async (page, password) => {
      await page.click('.local_join_btn')
      await page.fill('.join_address', address)
      await page.fill('.join_password', password)
      await page.click('.connect_world')
    }

    guest = await launch(guestDataDir)

    // the host's name is taken: back on the home menu with the reason, which
    // the player closes before joining under another name
    await setName(guest.page, 'Host')
    await joinAs(guest.page, 'secret')
    await expect(guest.page.locator('.local_menu_error_text')).toHaveText('Someone in this world is already called Host. Change your name and join again.', { timeout: 60_000 })
    await expect(guest.page.locator('#local_world_menu')).toBeVisible()
    await guest.page.click('.local_menu_error_close')
    await expect(guest.page.locator('.local_menu_error')).toBeHidden()

    await setName(guest.page, 'Guest')
    await joinAs(guest.page, 'wrong')
    await expect(guest.page.locator('.local_menu_message')).toHaveText('Wrong password')
    await joinAs(guest.page, 'secret')
    await guest.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    expect(await guest.page.evaluate(() => [window.game.sector.name, window.player.name])).toEqual(['Coop World', 'Guest'])

    // the team menu's thumbnail loads, from the host for the guest
    const loadThumbnail = (page) => page.evaluate(() => new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth)
      image.onerror = () => resolve(0)
      image.src = window.main.getScreenshotThumbnailPath(Object.keys(window.game.sector.screenshots)[0])
    }))
    expect(await loadThumbnail(host.page)).toBe(300)
    expect(await loadThumbnail(guest.page)).toBe(300)

    // a dropped connection reconnects on its own, with a fresh password proof
    await guest.page.evaluate(() => {
      window.droppedSocket = window.game.gameConnection.socket
      window.droppedSocket.close()
    })
    await guest.page.waitForFunction(() => {
      const connection = window.game.gameConnection
      return connection.socket !== window.droppedSocket && connection.isConnected() &&
        getComputedStyle(document.querySelector('.disconnected_msg')).display === 'none'
    }, null, { timeout: 30_000 })
    expect(await guest.page.evaluate(() => window.player.name)).toBe('Guest')

    // leaving and coming back (same profile, new app session) keeps the
    // character's identity
    await quit(guest.app)
    expect(guest.errors).toEqual([])
    guest = await launch(guestDataDir)
    await joinAs(guest.page, 'secret')
    await guest.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    expect(await guest.page.evaluate(() => window.player.name)).toBe('Guest')

    // the host quitting saves the world and tells the guest why they left
    await quit(host.app)
    expect(host.errors).toEqual([])
    host = null
    await guest.page.waitForFunction(() => document.body.innerText.includes('The host closed the world'), null, { timeout: 30_000 })
    await expect(guest.page.locator('#local_world_menu')).toBeVisible()

    await quit(guest.app)
    guest = null
    expect(savePaths().length).toBe(1)
  } finally {
    if (host) await quit(host.app)
    if (guest) await quit(guest.app)
    fs.rmSync(guestDataDir, { recursive: true, force: true })
  }
})

// asks the signalling server about a room, as the Join panel does:
// { type: 'room', worldName, ... } or { type: 'error', code, ... }
function lookupRoom(signalUrl, code) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(signalUrl + '/?v=1&role=lookup&code=' + code)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'lookup', version: 1, code })))
    ws.on('message', (data) => { resolve(JSON.parse(data)); ws.close() })
    ws.on('error', reject)
  })
}

// Online co-op over real WebRTC between two instances on this machine,
// through a signalling server started here with no STUN servers, so nothing
// leaves the machine: the Node server, and the Cloudflare Worker in workerd.
// NAT traversal is checked by hand (docs/exec-plans/active/webrtc-coop.md).
for (const backend of ['node', 'worker']) test(`hosts online with a room code, and a second instance joins over WebRTC (${backend} signalling)`, async () => {
  const signal = await startSignalBackend(backend, { iceServers: [] })
  const onlineEnv = { JUNON_SIGNAL_URL: signal.url }
  const guestDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-desktop-guest-'))
  let host
  let guest

  try {
    host = await launch(userDataDir, onlineEnv)
    expect(await host.page.evaluate(() => window.junonDesktop.online.getStatus())).toEqual({ isAvailable: true, signalUrl: onlineEnv.JUNON_SIGNAL_URL })
    await setName(host.page, 'Host')
    await host.page.evaluate(() => window.junonDesktop.localWorldApi('createWorld', [{ ownerUid: window.main.localProfile.uid, name: 'Online World', gameMode: 'survival' }]))
    await host.page.click('.local_host_btn')
    await host.page.click('.start_online_hosting')
    await host.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    await host.page.waitForFunction(() => document.body.innerText.includes('Friends join with the room code'), null, { timeout: 30_000 })

    const hosting = (await host.page.evaluate(() => window.junonDesktop.localWorldApi('listWorlds', []))).hosting
    expect(hosting).toMatchObject({ isOnline: true, port: null })
    expect(hosting.roomCode).toMatch(/^[2-9A-HJKMNP-TV-Z]{8}$/)
    expect(await lookupRoom(signal.url, hosting.roomCode)).toMatchObject({ type: 'room', worldName: 'Online World' })

    // the colony menu's Info tab shows the owner the code too
    await host.page.evaluate(() => window.game.teamMenu.open())
    await expect(host.page.locator('.room_code_input')).toHaveValue(hosting.roomCode.slice(0, 4) + '-' + hosting.roomCode.slice(4))
    await expect(host.page.locator('.copy_room_code_btn')).toBeVisible()
    await host.page.evaluate(() => window.game.teamMenu.close())

    guest = await launch(guestDataDir, onlineEnv)
    await setName(guest.page, 'Guest')
    const joinWith = async (code) => {
      await guest.page.click('.local_join_btn')
      await guest.page.fill('.join_room_code', code)
      await guest.page.click('.join_online')
    }

    await joinWith('ABCD-EFGH')
    await expect(guest.page.locator('.local_menu_message')).toHaveText(/No world is being hosted with that code/)
    await joinWith('nonsense')
    await expect(guest.page.locator('.local_menu_message')).toHaveText('Enter the 8-character room code from the host')

    // a host on another version is caught before connecting
    const otherVersion = new WebSocket(signal.url + '/?v=1&role=host')
    await new Promise((resolve) => otherVersion.on('open', resolve))
    otherVersion.send(JSON.stringify({ type: 'host', version: 1, protocol: '00000000', worldName: 'Old World' }))
    const otherCode = await new Promise((resolve) => otherVersion.on('message', (data) => resolve(JSON.parse(data).code)))
    await joinWith(otherCode)
    await expect(guest.page.locator('.local_menu_message')).toHaveText(/^Version mismatch/)
    otherVersion.close()

    // typed as a player might
    await joinWith((hosting.roomCode.slice(0, 4) + '-' + hosting.roomCode.slice(4)).toLowerCase())
    await guest.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    expect(await guest.page.evaluate(() => [window.game.sector.name, window.player.name, window.game.gameConnection.socket.url])).toEqual(['Online World', 'Guest', 'rtc:' + hosting.roomCode])
    await host.page.waitForFunction(() => Object.values(window.game.sector.players).some((player) => player.name === 'Guest'), null, { timeout: 30_000 })

    // a dropped connection reconnects on its own, through the room again
    await guest.page.evaluate(() => {
      window.droppedSocket = window.game.gameConnection.socket
      window.droppedSocket.close()
    })
    await guest.page.waitForFunction(() => {
      const connection = window.game.gameConnection
      return connection.socket !== window.droppedSocket && connection.isConnected() &&
        getComputedStyle(document.querySelector('.disconnected_msg')).display === 'none'
    }, null, { timeout: 60_000 })
    expect(await guest.page.evaluate(() => window.player.name)).toBe('Guest')

    // the Host panel shows the code to pass on
    await host.page.evaluate(() => window.main.onExitGameMenuBtnClick())
    await host.page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
    await host.page.click('.local_host_btn')
    await expect(host.page.locator('.host_summary')).toHaveText('Hosting Online World online.')
    await expect(host.page.locator('.room_code')).toHaveValue(hosting.roomCode.slice(0, 4) + '-' + hosting.roomCode.slice(4))

    // stopping tells the guest why, and closes the room
    await host.page.click('.stop_hosting')
    await guest.page.waitForFunction(() => document.body.innerText.includes('The host stopped hosting the world'), null, { timeout: 30_000 })
    await expect(guest.page.locator('#local_world_menu')).toBeVisible()
    await expect.poll(async () => (await lookupRoom(signal.url, hosting.roomCode)).code).toBe('not_found')

    // hosting again opens a new room; the host quitting saves the world and
    // tells the guest why they left
    await host.page.click('.start_online_hosting')
    // the new room's code comes from the signalling server a moment later
    await host.page.waitForFunction(async () => {
      const hosting = (await window.junonDesktop.localWorldApi('getHosting', [])).hosting
      return !!(hosting && hosting.roomCode)
    }, null, { timeout: 30_000 })
    const rehosting = (await host.page.evaluate(() => window.junonDesktop.localWorldApi('listWorlds', []))).hosting
    expect(rehosting.roomCode).not.toBe(hosting.roomCode)
    await joinWith(rehosting.roomCode)
    // window.player is still the last session's until the new one starts
    await host.page.waitForFunction(() => Object.values(window.game.sector.players).some((player) => player.name === 'Guest'), null, { timeout: 120_000 })
    await guest.page.waitForFunction((url) => window.game.gameConnection.socket.url === url && window.game.gameConnection.isConnected(), 'rtc:' + rehosting.roomCode, { timeout: 30_000 })

    await quit(host.app)
    expect(host.errors).toEqual([])
    host = null
    await guest.page.waitForFunction(() => document.body.innerText.includes('The host closed the world'), null, { timeout: 30_000 })
    await expect(guest.page.locator('#local_world_menu')).toBeVisible()

    await quit(guest.app)
    expect(guest.errors).toEqual([])
    guest = null
  } finally {
    if (host) await quit(host.app)
    if (guest) await quit(guest.app)
    await signal.stop()
    fs.rmSync(guestDataDir, { recursive: true, force: true })
  }
})

// the language is kept in localStorage: app:// pages can't store cookies
test('keeps the chosen language after a restart', async () => {
  let { app, page, errors } = await launch()
  await page.selectOption('#language_select', 'ja')
  await page.waitForURL(/\/ja\/$/)
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })
  await quit(app)

  ;({ app, page, errors } = await launch())
  await page.waitForURL(/\/ja\/$/)
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })
  await expect(page.locator('#language_select')).toHaveValue('ja')

  await page.selectOption('#language_select', 'en')
  await page.waitForURL(/\/en\/$/)
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })
  await quit(app)
  expect(errors).toEqual([])
})

// The app on an in-memory Steam (support/fake_steam.js) in place of the
// binding. scenario: see the end of that file.
function steamEnv(scenario) {
  return { JUNON_STEAM: '1', JUNON_STEAM_FAKE_SDK: path.join(__dirname, 'support', 'fake_steam.js'), JUNON_FAKE_STEAM: JSON.stringify(scenario) }
}

const ALLY = { steamId: '76561198000000002', personaName: 'Ally', hostsLobby: { protocol: '00000000', version: '0.0.1' } }

// The Steam menus, against a fake Steam. Game traffic between two players on
// Steam is covered by steam_relay.spec.js; the friend here only exists in the
// app's own process, so joining them stops at the version check.
test('hosts on Steam, invites friends and joins a friend from the menu', async () => {
  let { app, page, errors } = await launch(userDataDir, steamEnv({ steamId: '76561198000000001', personaName: 'Me', others: [ALLY] }))
  const fakeSteam = (fn, arg) => app.evaluate((electron, [source, arg]) => new Function('steam', 'arg', 'return (' + source + ')(steam, arg)')(global.junonFakeSteam, arg), [fn.toString(), arg])

  expect(await page.evaluate(() => window.junonDesktop.steam.call('getStatus'))).toEqual({ isAvailable: true, steamId: '76561198000000001', personaName: 'Me', pendingLobbyId: null })

  await page.evaluate(() => window.junonDesktop.localWorldApi('createWorld', [{ ownerUid: window.main.localProfile.uid, name: 'Steam World', gameMode: 'survival' }]))
  await page.click('.local_host_btn')
  await page.selectOption('.steam_lobby_type', 'invite')
  await page.click('.start_steam_hosting')
  await page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
  await page.waitForFunction(() => document.body.innerText.includes('Co-op is open on Steam to friends you invite'), null, { timeout: 30_000 })

  const lobby = await fakeSteam((steam) => Array.from(steam.network.lobbies.values()).find((entry) => entry.owner === steam.steamId))
  expect(lobby).toMatchObject({ type: 0, maxMembers: 20, data: { junon: '1', world: 'Steam World' } })

  // back in the menu, the Host panel invites friends
  await page.evaluate(() => window.main.onExitGameMenuBtnClick())
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
  await page.click('.local_host_btn')
  await expect(page.locator('.host_summary')).toHaveText('Hosting Steam World on Steam.')
  await expect(page.locator('.steam_hosting_summary')).toHaveText('Only friends you invite can join.')
  await page.click('.steam_invite_dialog')
  await page.locator('.steam_friend', { hasText: 'Ally' }).locator('.steam_invite').click()
  await expect(page.locator('.steam_friend .steam_invite')).toHaveText('Invited')
  expect(await fakeSteam((steam) => steam.calls)).toEqual([
    { type: 'inviteDialog', lobbyId: lobby.id },
    { type: 'invite', lobbyId: lobby.id, steamId: ALLY.steamId }
  ])

  // stopping hosting leaves the lobby
  await page.click('.stop_hosting')
  await page.locator('.start_steam_hosting').waitFor()
  expect(await fakeSteam((steam, id) => steam.network.lobbies.has(id), lobby.id)).toBe(false)

  // the Join panel lists friends hosting on Steam; this one runs another
  // version, which the lobby data tells before connecting
  await page.click('.local_join_btn')
  await expect(page.locator('.steam_host')).toHaveText(/Ally · Hosting Ally's world/)
  await page.click('.steam_join')
  await expect(page.locator('.local_menu_message')).toHaveText(/Version mismatch: the host runs Junon 0\.0\.1/)

  // an invite accepted in Steam while the game runs goes the same way
  await page.click('.local_new_btn')
  const allyLobby = await fakeSteam((steam) => Array.from(steam.network.lobbies.keys())[0])
  await fakeSteam((steam, id) => steam.requestJoin(id, '76561198000000002'), allyLobby)
  await expect(page.locator('.local_menu_message')).toHaveText(/Version mismatch/)

  await quit(app)
  expect(errors).toEqual([])

  // an invite accepted while the game was closed starts it with the lobby
  ;({ app, page, errors } = await launch(userDataDir, steamEnv({ steamId: '76561198000000001', others: [ALLY], launchLobby: true })))
  await expect(page.locator('.local_menu_message')).toHaveText(/Version mismatch/)
  await quit(app)
  expect(errors).toEqual([])
})
