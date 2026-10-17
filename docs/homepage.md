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
- **New world** asks for a name, a mode and the map size in tiles (rows and
  columns, 128 x 128 by default). Each side must be a positive multiple of 16
  (a chunk, `chunkRowCount`); `createWorld` refuses anything else. There is
  deliberately no upper limit: generation time and memory grow with the area
  (measured: 1024 x 1024 about 15 s). The size only applies when the map is
  generated; a save keeps its own. Maps needn't be square: the in-game map
  fits the longer side, at least one pixel per tile, and a map over 512 tiles
  gets mini map canvases larger than 512 pixels (`MapMenu#resizeCanvas`).
- While a world is created, the form disables its button and shows a progress
  bar with the stage ("Generating terrain", then "Mapping regions") and a
  percentage, polled from `getWorldProgress` (`GET /local/worlds/progress` in
  a browser) every 250 ms (`LocalWorldMenu#followWorldProgress`). The server
  generates a new map in slices of the event loop so it can answer
  meanwhile: `MapGenerator#generate` and `Sector#buildRegionSteps` are
  generator functions whose yields are pause points, run by
  `server/util/steps.js` (`/map regenerate` still runs them in one go). Only
  one world loads at a time; opening, creating, deleting or hosting during a
  load is refused with "A world is still loading".
- Each world card has a delete button (top right, shown on hover or focus).
  After a confirm dialog it calls `deleteWorld`, which removes the save
  directory, the thumbnail and the `sectors` row. If the world is open, the
  server stops hosting and closes it without saving first. Only the owning
  profile can delete a world. `test/e2e/world_management.spec.js` covers the
  form and the delete button.
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
  In game, the colony menu's (P) Info tab shows the owner the same field,
  under the member list; it asks the local game server (`getHosting`, or
  `GET /local/host` in a browser) each time the menu opens.
  Join: a room code field and Join. The code is checked with the signalling
  server first, so a wrong code or another version shows in the menu message.
  The owner's in-game Info tab has a Visibility section above the room code,
  with a Room label and a Private/Public dropdown aligned and styled like the
  Members role dropdown. Both dropdowns align with the colony info values and
  room code. The active Host panel labels Room code and Visibility in matching
  rows, with the input and dropdown aligned in the same column.
  Rooms start Private; Public adds them to the browser under Join co-op, and
  switching back removes them. Either way, the code still works. The browser shows only rooms using
  the current game's protocol hash and offers a Refresh button. Join co-op
  shows Public rooms as the main browser, with code and address joining in a
  separate column. On narrower windows, these sections stack.
  With Steam or online co-op, the address form gets a "By address" heading.
- Switching panels clears the previous panel's error message.
- When the game server refuses a join (`CantJoin`, e.g. a name already in the
  world), kicks the player, or the host goes away, the client closes the
  connection, returns to this menu and shows the reason in a banner above the
  panel (`.local_menu_error`, closed with `.local_menu_error_close`). It stays
  across panels until closed or another world is joined
  (`Main#onPlayerCantJoin`, `LocalWorldMenu#showError`).

## Selectors other code depends on

The e2e join helper (`test/e2e/support/join.js`) waits for `#local_world_menu`,
then uses `.local_new_btn`, `.world_name`, `.world_mode` and `.create_world`;
the map size inputs are `.world_rows` and `.world_cols`. A world card is
`.local_world_card`, holding the `.local_world_entry` button (which opens the
world) and `.local_world_delete`. The creation progress is `.world_progress`
(shown with `.visible`), `.world_progress_label` and `.world_progress_fill`.
`LocalWorldMenu` binds `.local_<name>_btn` for `new`, `load`, `tutorial`,
`import`, `host` and `join`, plus `.local_continue_btn`. The Steam controls
are `.steam_lobby_type`, `.start_steam_hosting`, `.steam_invite_dialog`,
`.steam_friend .steam_invite`, `.steam_host .steam_join` and `.steam_refresh`;
the hosting view's `.host_summary` and `.steam_hosting_summary`. The online
controls are `.start_online_hosting`, `.room_code`, `.copy_room_code`,
`.room_visibility_select`, `.online_room`, `.refresh_online_rooms`,
`.join_room_code` and `.join_online`. The in-game control is
the same `.room_visibility_select` dropdown in its own
`.room_visibility_section` above the room code. The section uses a
Members-style heading. The active hosting panel has the same Public/Private
choice.
Public browser entries display a live player count, maximum player count and
the saved colony screenshot thumbnail. Hosts send a resized, bounded JPEG to
signalling; it updates while hosting. If a world has no screenshot, or an
older signalling service omits the details, the browser shows a preview and
count placeholder. Private rooms never appear in the directory.
The public browser preview is independent of the in-game screenshot gallery;
the latter uses host HTTP image paths and is unavailable to WebRTC guests.
The desktop tests use them. A new local
world API method must be added to `client/src/util/local_world_api.js` and to
`LOCAL_WORLD_API_METHODS` in `packages/junon-desktop/src/main.js`, or the
client can't call it and the desktop app rejects it.
