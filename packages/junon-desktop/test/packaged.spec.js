// Runs a packaged build (npm run desktop:package): the app starts from the
// release folder, its game server finds junon-io and the native modules for
// this platform, and a world can be created and saved. Skipped unless
// JUNON_PACKAGED_APP points at the packaged executable, e.g.
// release/linux-unpacked/junon-desktop; on a Linux machine without a display,
// run under xvfb-run.
const { test, expect, _electron: electron } = require('@playwright/test')
const fs = require('fs')
const os = require('os')
const path = require('path')

const EXECUTABLE = process.env.JUNON_PACKAGED_APP

// software WebGL, as in desktop.spec.js
const CHROMIUM_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']

test.skip(!EXECUTABLE, 'JUNON_PACKAGED_APP is not set')

test('the packaged app creates and saves a world', async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-packaged-'))
  try {
    const app = await electron.launch({
      executablePath: path.resolve(EXECUTABLE),
      args: CHROMIUM_ARGS,
      env: Object.assign({}, process.env, { JUNON_USER_DATA_DIR: userDataDir, JUNON_SIGNAL_URL: 'off' })
    })
    const page = await app.firstWindow()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })

    expect(await app.evaluate(({ app }) => app.isPackaged)).toBe(true)
    // itch.io builds ship without Steam
    expect(await page.evaluate(() => window.junonDesktop.steam.call('getStatus'))).toEqual({ isAvailable: false })

    await page.click('.local_new_btn')
    await page.fill('.world_name', 'Packaged World')
    await page.selectOption('.world_mode', 'survival')
    await page.click('.create_world')
    await page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    const worldId = await page.evaluate(() => window.game.sector.uid)

    const closed = app.waitForEvent('close')
    await app.evaluate(({ app }) => app.quit())
    await closed

    expect(errors).toEqual([])
    expect(fs.existsSync(path.join(userDataDir, 'saves', worldId, 'sector.sav'))).toBe(true)
  } finally {
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
