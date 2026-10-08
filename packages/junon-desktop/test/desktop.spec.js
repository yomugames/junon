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

async function launch() {
  const app = await electron.launch({
    args: CHROMIUM_ARGS.concat([APP_DIR]),
    env: Object.assign({}, process.env, { JUNON_USER_DATA_DIR: userDataDir })
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
