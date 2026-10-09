// Launches the Electron app against a temporary user-data directory: the
// window loads the standalone client from app://, the game server runs in a
// utility process, and the local menu reaches it over the preload API.
// Requires `NODE_ENV=standalone npm run client:build` first; on a Linux machine
// without a display, run under xvfb-run.
const { test, expect, _electron: electron } = require('@playwright/test')
const fs = require('fs')
const os = require('os')
const path = require('path')

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

async function launch(dataDir = userDataDir) {
  const app = await electron.launch({
    args: CHROMIUM_ARGS.concat([APP_DIR]),
    env: Object.assign({}, process.env, { JUNON_USER_DATA_DIR: dataDir })
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
    await setName(guest.page, 'Guest')
    await joinAs(guest.page, 'wrong')
    await expect(guest.page.locator('.local_menu_message')).toHaveText('Wrong password')
    await joinAs(guest.page, 'secret')
    await guest.page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    expect(await guest.page.evaluate(() => [window.game.sector.name, window.player.name])).toEqual(['Coop World', 'Guest'])

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
