# Home screen

The home screen is the local world menu
(`packages/junon-io/client/src/components/local_world_menu.js`), styled as a
desktop game main menu. Markup is `#local_world_menu` in
`packages/junon-io/client/main.ejs`; styles are the "Home screen: desktop main
menu" block in `client/stylesheets/style.css`.

## Layout

- Left rail (`.home_rail`): logo, the menu (`.local_menu_actions`) and the game
  version, which opens the Patch notes panel.
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
- A card shows the world's preview (taken with the camera button in the colony
  menu's Preview tab) or placeholder art. `listWorlds` returns each preview as a
  `data:` URL (`Server#readWorldThumbnail`), because closed worlds' thumbnails
  aren't served over HTTP and the desktop app has no page server.
  `test/e2e/world_thumbnail.spec.js` covers this.
- **Patch notes** shows the 10 latest `changelogs/` entries, newest first. They
  are rendered into `#local_changelog_template` when the page is built, so the
  desktop app needs a client rebuild to show a new release.
  `test/e2e/patch_notes.spec.js` covers this.
- **Tutorial** calls `startTutorial`: the server closes the open world (saving
  it), stops hosting, and starts a fresh tutorial game from
  `common/tutorial.sav.gz` (`Server#activateTutorialWorld`). The tutorial has
  no sectors row and is never saved, so it never appears in the world list;
  opening any other world discards it. The client recognises it by the map's
  sector name, "Tutorial Lobby". `test/e2e/tutorial.spec.js` covers this.
- **Host co-op** and **Join co-op** get a Steam section above the address
  form when the desktop app has Steam (`steam.call('getStatus')`; see
  [development.md](development.md#steam)). Host: who can join (Steam friends,
  or only invited friends) and **Host on Steam and play**
  (`hostWorldOnSteam`). While hosting on Steam, the Host panel offers Steam's
  invite dialog and an Invite button for each online friend. Join: the
  friends hosting Junon on Steam, each with a Join button, and a Refresh
  button. An invite accepted in Steam, or Join Game in the friends list,
  joins the same way, after asking first if a world is open; an invite that
  started the game is joined once the menu loads. Going back to the menu
  leaves the host's Steam lobby. Errors, such as a version mismatch, show in
  the menu message. The desktop test "hosts on Steam, invites friends and
  joins a friend from the menu" covers these panels on a fake Steam.
- **Host co-op** and **Join co-op** get an Online section above the address
  form when the desktop app knows a signalling server
  (`online.getStatus()`; see
  [development.md](development.md#online-co-op-webrtc)). Host: **Host online
  and play** (`hostWorldOnline`); while hosting, the Host panel shows the room
  code in a read-only field with a Copy button, and the owner gets it in chat.
  Join: a room code field and Join. The code is checked with the signalling
  server first, so a wrong code or another version shows in the menu message.
  With Steam or online co-op, the address form gets a "By address" heading.
- Switching panels clears the previous panel's error message.

## Selectors other code depends on

The e2e join helper (`test/e2e/support/join.js`) waits for `#local_world_menu`,
then uses `.local_new_btn`, `.world_name`, `.world_mode` and `.create_world`.
`LocalWorldMenu` binds `.local_<name>_btn` for `new`, `load`, `tutorial`,
`import`, `host` and `join`, plus `.local_continue_btn`. The Steam controls
are `.steam_lobby_type`, `.start_steam_hosting`, `.steam_invite_dialog`,
`.steam_friend .steam_invite`, `.steam_host .steam_join` and `.steam_refresh`;
the hosting view's `.host_summary` and `.steam_hosting_summary`. The online
controls are `.start_online_hosting`, `.room_code`, `.copy_room_code`,
`.join_room_code` and `.join_online`. The desktop tests use them. A new local
world API method must be added to `client/src/util/local_world_api.js` and to
`LOCAL_WORLD_API_METHODS` in `packages/junon-desktop/src/main.js`, or the
client can't call it and the desktop app rejects it.
