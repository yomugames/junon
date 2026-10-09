// Drives the local world menu (client/src/components/local_world_menu.js),
// the same path a player takes: New world -> name and mode -> Create and play.
// The server then replaces the world it had open with the new one, so every
// test starts in a fresh colony. Each Playwright test has its own browser
// context, and with it its own local profile, which owns the new world.
//
// gameMode is what the New world form offers: "survival", "peaceful" (shown
// as Sandbox) or "hardcore". Chat commands other than a few only run in a
// peaceful colony (server/commands/base_command.js#canExecute), and crafting
// in one skips the ingredient check for the owner.
async function createNewColonyAndJoin(page, { gameMode = 'survival' } = {}) {
  await page.goto('/')
  await page.locator('#local_world_menu').waitFor({ state: 'visible', timeout: 30_000 })

  await page.click('.local_new_btn')
  await page.fill('.world_name', 'E2E Colony')
  await page.selectOption('.world_mode', gameMode)
  await page.click('.create_world')

  // client/src/entities/game.js sets window.player only once JoinGame is
  // handled, i.e. once the real join handshake has fully completed
  await page.waitForFunction(() => !!window.player, null, { timeout: 60_000 })

  // a colony creator gets a "Welcome" modal (client/src/menus/welcome_menu.js)
  // that sits front-and-center over the game. It's not just visual: while
  // #welcome_container is showing, Game#isInGameMenuOpen() makes
  // globalMouseMoveHandler() (client/src/entities/input_controller.js) bail
  // out immediately, so mouse-driven facing/aiming silently no-ops for as
  // long as this stays open.
  const welcomeCancel = page.locator('#welcome_menu .cancel_btn')
  if (await welcomeCancel.isVisible()) await welcomeCancel.click()
}

module.exports = { createNewColonyAndJoin }
