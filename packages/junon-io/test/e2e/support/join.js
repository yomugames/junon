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

// Picks the colony's game mode through the real "Choose a Game Mode" menu
// (client/src/menus/select_difficulty_menu.js -> SectorAction ->
// server/entities/game.js#setGameMode).
//
// A new colony starts with no game mode at all, and a lot of behaviour hangs
// off it - most chat commands only run in a peaceful/sandbox colony
// (server/commands/base_command.js#canExecute), and crafting in a peaceful
// colony skips the ingredient check for the owner
// (server/entities/inventory.js#isSandboxMode). So a test that cares either way
// has to say so.
//
// The menu is normally opened for the owner right after joining, but
// SelectDifficultyMenu#showGameMode gates that on sector.createdAt, which is
// only populated from the sector's database row
// (server/entities/sector.js) - the harness runs without MySQL, so createdAt
// stays 0 and the menu never opens by itself. It is opened here directly and
// then driven exactly as a player would: pick a mode, press accept, wait for
// the server's SectorUpdated to come back.
async function selectGameMode(page, gameMode) {
  await page.evaluate(() => window.game.selectDifficultyMenu.open())
  await page.click(`#select_difficulty_menu .game_mode[data-mode='${gameMode}']`)
  await page.click('#select_difficulty_menu .accept_game_mode_btn')

  await page.waitForFunction(
    (mode) => window.game.sector.gameMode === mode,
    gameMode,
    { timeout: 15_000 }
  )

  // the menu closes itself on SectorUpdated (sector.js#onGameModeChanged), but
  // only when the mode actually changed; closing again is harmless and keeps
  // the modal from blocking mouse aiming if it ever doesn't
  await page.evaluate(() => window.game.selectDifficultyMenu.close())
}

module.exports = { createNewColonyAndJoin, selectGameMode }
