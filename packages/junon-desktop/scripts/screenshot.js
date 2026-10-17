// Screenshots of the desktop app, for checking UI changes by eye. Launches
// Electron with Playwright against a temporary user-data directory, creates a
// world through the local menu and plays it, optionally hosting it
// online against a signalling server started in this process (nothing leaves
// the machine), then saves PNGs.
//
//   NODE_ENV=standalone npm run client:build
//   npm run screenshot --workspace packages/junon-desktop -- [options]
//
// On a Linux machine without a display, prefix the second command with
// `xvfb-run -a`.
//
// Options:
//   --online         host the world online, so the owner gets a room code
//   --colony-menu    open the colony menu (P) on its Info tab
//   --hosting-menu   show the homepage's active online hosting panel
//   --join-menu      show the homepage's Public rooms browser
//   --copy           with --colony-menu: click Copy next to the room code too
//   --public         with --online --colony-menu: show the room as Public
//   --out <dir>      where to write the PNGs (default: <tmp>/junon-screenshots)
const { _electron: electron } = require('@playwright/test')
const fs = require('fs')
const os = require('os')
const path = require('path')

const APP_DIR = path.resolve(__dirname, '..')

// software WebGL, as in test/desktop.spec.js
const CHROMIUM_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']

function parseArgs(argv) {
  const options = { online: false, colonyMenu: false, hostingMenu: false, joinMenu: false, copy: false, public: false, out: path.join(os.tmpdir(), 'junon-screenshots') }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--online') options.online = true
    else if (arg === '--colony-menu') options.colonyMenu = true
    else if (arg === '--hosting-menu') options.hostingMenu = true
    else if (arg === '--join-menu') options.joinMenu = true
    else if (arg === '--copy') options.copy = true
    else if (arg === '--public') options.public = true
    else if (arg === '--out' && argv[i + 1]) options.out = path.resolve(argv[++i])
    else throw new Error('Unknown option ' + arg + '. See the comment at the top of scripts/screenshot.js.')
  }
  if (options.copy && !options.colonyMenu) throw new Error('--copy needs --colony-menu')
  if (options.public && (!options.online || !options.colonyMenu)) throw new Error('--public needs --online and --colony-menu')
  if (options.hostingMenu && !options.online) throw new Error('--hosting-menu needs --online')
  if (options.joinMenu && !options.online) throw new Error('--join-menu needs --online')
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  fs.mkdirSync(options.out, { recursive: true })

  // junon-signal is a dev dependency, so only required when hosting online
  const signal = options.online ? await require('junon-signal/testing').startSignalBackend('node', { iceServers: [] }) : null
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-screenshot-'))
  const env = Object.assign({}, process.env, {
    JUNON_USER_DATA_DIR: dataDir,
    JUNON_STEAM: '0',
    JUNON_SIGNAL_URL: signal ? signal.url : 'off'
  })
  const app = await electron.launch({ args: CHROMIUM_ARGS.concat([APP_DIR]), env: env })
  const saved = []
  const save = async (name, locator) => {
    const file = path.join(options.out, name + '.png')
    if (locator) {
      const box = await locator.boundingBox()
      if (!box) throw new Error('The menu is not visible for a screenshot')
      await page.screenshot({ path: file, clip: box, timeout: 60_000 })
    } else {
      await page.screenshot({ path: file, timeout: 60_000 })
    }
    saved.push(file)
  }
  let page

  try {
    page = await app.firstWindow()
    await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 60_000 })
    await page.fill('.local_player_name', 'Host')
    await page.dispatchEvent('.local_player_name', 'change')

    if (options.online) {
      await page.evaluate(() => window.junonDesktop.localWorldApi('createWorld', [{ ownerUid: window.main.localProfile.uid, name: 'Screenshot World', gameMode: 'survival' }]))
      await page.click('.local_host_btn')
      await page.click('.start_online_hosting')
    } else {
      await page.click('.local_new_btn')
      await page.fill('.world_name', 'Screenshot World')
      await page.click('.create_world')
    }
    await page.waitForFunction(() => !!window.player, null, { timeout: 120_000 })
    if (options.online) {
      await page.waitForFunction(() => document.body.innerText.includes('Friends join with the room code'), null, { timeout: 30_000 })
    }
    // let the first frames render
    await page.waitForTimeout(2000)
    await save('game')

    if (options.public && options.joinMenu) {
      await page.evaluate(() => window.game.screenshot())
      await page.waitForFunction(async () => {
        const details = await window.junonDesktop.localWorldApi('listWorlds', [])
        return !!details.worlds.find((world) => world.name === 'Screenshot World' && world.thumbnail)
      }, null, { timeout: 30_000 })
    }

    if (options.colonyMenu) {
      // the game takes keys once the canvas has focus
      await page.mouse.click(640, 400)
      await page.keyboard.press('p')
      const menu = page.locator('#manage_team_menu')
      await menu.waitFor({ state: 'visible', timeout: 10_000 })
      if (options.online) await page.locator('.room_code_entry').waitFor({ state: 'visible', timeout: 10_000 })
      if (options.public) {
        await page.waitForFunction(() => document.querySelector('.room_visibility_section .room_visibility_select').value === 'private')
        await save('colony_menu_private', menu)
        await page.selectOption('.room_visibility_section .room_visibility_select', 'public')
        await page.waitForFunction(() => document.querySelector('.room_visibility_section .room_visibility_select').value === 'public')
        if (options.joinMenu) {
          await page.waitForFunction(async (url) => {
            const rooms = (await (await fetch(url)).json()).rooms
            return rooms.some((room) => room.thumbnail && room.playerCount === 1 && room.maxPlayers === 20)
          }, signal.url.replace(/^ws/, 'http') + '/rooms', { timeout: 30_000 }).catch(async (error) => {
            const rooms = await (await fetch(signal.url.replace(/^ws/, 'http') + '/rooms')).json()
            throw new Error(error.message + ': ' + JSON.stringify(rooms.rooms.map((room) => ({
              playerCount: room.playerCount, maxPlayers: room.maxPlayers,
              thumbnailLength: room.thumbnail && room.thumbnail.length
            }))))
          })
        }
      }
      await page.waitForTimeout(500)
      await save('colony_menu_screen')
      await save(options.public ? 'colony_menu_public' : 'colony_menu', menu)

      if (options.copy) {
        await page.click('.copy_room_code_btn')
        await save('colony_menu_copied', menu)
      }
    }
    if (options.hostingMenu) {
      await page.evaluate(() => window.main.onExitGameMenuBtnClick())
      await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
      await page.click('.local_host_btn')
      await page.waitForFunction(() => ['private', 'public'].includes(document.querySelector('.online_hosting .room_visibility_select')?.value), null, { timeout: 10_000 })
      await save('hosting_menu')
    }
    if (options.joinMenu) {
      if (!options.hostingMenu) {
        await page.evaluate(() => window.main.onExitGameMenuBtnClick())
        await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })
      }
      await page.click('.local_join_btn')
      if (options.public) {
        await page.locator('.online_room').waitFor({ state: 'visible', timeout: 10_000 })
        await page.waitForFunction(() => !!document.querySelector('.online_room_preview img') &&
          /^\d+ \/ 20 players$/.test(document.querySelector('.online_room_players')?.textContent || ''), null, { timeout: 30_000 })
        await save('join_menu_public')
        await page.click('.local_host_btn')
        await page.waitForFunction(() => document.querySelector('.online_hosting .room_visibility_select')?.value === 'public', null, { timeout: 10_000 })
        await page.selectOption('.online_hosting .room_visibility_select', 'private')
        await page.waitForFunction(() => document.querySelector('.online_hosting .room_visibility_hint')?.textContent === 'Private rooms are joinable by code.', null, { timeout: 10_000 })
        await page.click('.local_join_btn')
        await page.getByText('No public rooms are available.').waitFor({ state: 'visible', timeout: 10_000 })
        await save('join_menu_private')
      } else {
        await page.getByText('No public rooms are available.').waitFor({ state: 'visible', timeout: 10_000 })
        await save('join_menu_private')
      }
    }
  } finally {
    if (page && page.isClosed() === false) {
      await app.evaluate(({ app }) => app.quit()).catch(() => {})
    }
    await app.close().catch(() => {})
    if (signal) await signal.stop()
    fs.rmSync(dataDir, { recursive: true, force: true })
  }

  saved.forEach((file) => console.log(file))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
