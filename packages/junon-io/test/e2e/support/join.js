// Drives the real main-menu UI through the real matchmaker -> game-server
// handshake (client/src/main.js: .default_play_btn -> .new_colony_menu_btn ->
// requestNewColonyFromMatchmaker()), the same path a human player takes.
async function createNewColonyAndJoin(page) {
  // client checks Cookies.get('tutorial_done') and otherwise shows a
  // "play tutorial?" confirm dialog before creating the colony
  await page.context().addCookies([
    { name: 'tutorial_done', value: 'true', url: 'http://localhost:8001' }
  ])

  await page.goto('/')
  await page.click('.default_play_btn')
  await page.click('.new_colony_menu_btn')

  // client/src/entities/game.js sets window.player only once JoinGame is
  // handled, i.e. once the real join handshake has fully completed
  await page.waitForFunction(() => !!window.player, { timeout: 30_000 })

  // a colony creator gets a "Welcome" modal (client/src/menus/welcome_menu.js)
  // that sits front-and-center over the game. It's not just visual: while
  // #welcome_container is showing, Game#isInGameMenuOpen() makes
  // globalMouseMoveHandler() (client/src/entities/input_controller.js) bail
  // out immediately, so mouse-driven facing/aiming silently no-ops for as
  // long as this stays open.
  await page.click('#welcome_menu .cancel_btn')
}

module.exports = { createNewColonyAndJoin }
