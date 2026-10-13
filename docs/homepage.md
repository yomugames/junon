# Home screen

The home screen is the local world menu
(`packages/junon-io/client/src/components/local_world_menu.js`), styled as a
desktop game main menu. Markup is `#local_world_menu` in
`packages/junon-io/client/main.ejs`; styles are the "Home screen: desktop main
menu" block in `client/stylesheets/style.css`.

## Layout

- Left rail (`.home_rail`): logo, the menu (`.local_menu_actions`) and the game
  version.
- Top bar (`.home_topbar`): the player name (`.local_player_name`, saved to the
  local profile) and the language select.
- Content panel (`.local_menu_panel`): each menu entry renders its panel here
  and is highlighted while that panel shows (`LocalWorldMenu#setActive`).
  "Load world" is the default panel and shows the worlds as cards.
- The background is the static `assets/images/background/space.jpg`, darkened
  by `.home_shade`, which is inside the menu so it goes away when a world opens.

## Behavior

- **Continue** opens the first world from `listWorlds`, which the server
  orders by `updatedAt`, so it is the last one played. It is hidden when there
  are no worlds.
- World cards show the name, mode (`peaceful` is labelled Sandbox) and day; the
  colored top edge marks the mode, and the world being hosted gets a "Hosting"
  badge. Names are player input, so cards are built with `textContent`.
- **Tutorial** calls `startTutorial`: the server closes the open world (saving
  it), stops hosting, and starts a fresh tutorial game from
  `common/tutorial.sav.gz` (`Server#activateTutorialWorld`). The tutorial has
  no sectors row and is never saved, so it never appears in the world list;
  opening any other world discards it. The client recognises it by the map's
  sector name, "Tutorial Lobby". `test/e2e/tutorial.spec.js` covers this.
- Switching panels clears the previous panel's error message.

## Selectors other code depends on

The e2e join helper (`test/e2e/support/join.js`) waits for `#local_world_menu`,
then uses `.local_new_btn`, `.world_name`, `.world_mode` and `.create_world`.
`LocalWorldMenu` binds `.local_<name>_btn` for `new`, `load`, `tutorial`,
`import`, `host` and `join`, plus `.local_continue_btn`. A new local world API
method must also be added to `LOCAL_WORLD_API_METHODS` in
`packages/junon-desktop/src/main.js`, or the desktop app rejects it.
