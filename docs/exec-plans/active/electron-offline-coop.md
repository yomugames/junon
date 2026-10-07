# Outcome

Junon ships as an Electron desktop game that is offline-first: a player can
create, play, save, and reload worlds with no network access and no hosted
services. Any player can optionally open their world to friends for co-op
("listen server", Minecraft style); friends join by address and port.

Acceptance criteria:

- The desktop app starts and plays a world with networking disabled, and with no
  MySQL, Firebase, AWS/S3, Sentry, or matchmaker configuration present.
- Worlds are stored as files under the Electron user-data directory and survive
  app restarts; the game autosaves and saves on quit.
- A host can open a running world for co-op; a second client on the LAN (or
  reachable via port forwarding / an overlay VPN) can join, play, leave, and
  rejoin with its character intact.
- A save file from the hosted game (any supported `save_vN` format) can be
  imported. The importer owns the world, picks which saved character they play
  as (that character's team becomes their team), can switch characters later,
  and no account ids from the hosted game remain in the imported world.
- PvP and minigame modes are gone from the product and the codebase.

## Context

- Architecture today: browser client -> matchmaker -> authoritative game server,
  with MySQL, Firebase, and S3 behind both services. See
  [ARCHITECTURE.md](../../../ARCHITECTURE.md).
- Core design: keep the authoritative game server and run it on the host's
  machine. Singleplayer is a local server bound to `127.0.0.1`; hosting binds
  it to `0.0.0.0`. Minecraft's integrated server works the same way. The
  simulation, commands, AI, and protobuf wire protocol keep working as they are.
- Integration points to replace:
  - S3 world storage: `packages/junon-common/world_serializer.js` (`upload`,
    `readFile`, `listSectors`, `existsRemotely`) and
    `packages/junon-io/server/entities/game.js` (`getS3`, `putObject`,
    `deleteObject`); plus `server/util/s3_client.js` and the tasks under
    `server/util/tasks/`.
  - Firebase identity: `idToken` -> `server.getUidFromRequest` in
    `game.js` `performJoinGame` and `resumeIdToken`; client-side
    `client/src/util/firebase_client_helper.js`, `menus/user_profile_menu.js`.
  - MySQL/Sequelize models used by the server: `SectorModel`, `User`, `IpBan`,
    `Favorite` (`server/server.js`), sector bans/votes/friends via
    `junon-common/db/`.
  - Matchmaker coupling: the calls guarded by `global.isMatchmakerDisabledForTest`
    in `server/server.js`, and client `components/game_explorer.js`,
    `components/pvp_explorer.js`.
  - Existing offline seam: `global.isOffline` (`server/server.js`), already
    checked in about 20 places.
- Save compatibility: saves are gzip-compressed protobuf `SaveState` messages
  with versioned schemas `save_v7` .. `save_v39` in
  `packages/junon-common/protocol/save_formats/`. Characters are keyed by
  account uid (`Entities.playerDataMap`, `Player.uid`, `PlayerData.uid`), and
  teams record `creatorUid`, `leaderUid`, and a `LeaderRef` (player entity id).
  Old uids are Firebase uids. `OwnerRef` on buildings, mobs, and corpses holds
  an entity id, not a uid, so team-owned structures don't depend on accounts.
- PvP/minigame code is spread through the codebase: `isPvP()`/`isMiniGame()`
  have about 164 call sites across `server/`, `client/src/`, and `common/`, and there
  are dedicated modules (`server/entities/minigames/`,
  `server/entities/minigame_objectives.js`, `server/commands/endround.js`,
  `junon-matchmaker/src/minigame.js`).

## Progress

- [x] 2026-09-28: Mapped external integrations and agreed on scope (see Decisions).
- [x] 2026-10-07: Phase 1: the server runs standalone (`NODE_ENV=standalone`)
  with file storage, local-profile identity, and a direct-connect client
  entry. Two Phase 1 steps moved: the world list (step 2) to Phase 4, and
  removing the remaining database call sites (step 5) to a prerequisite of
  Phase 5. See Phase 1 below.
- [x] 2026-10-07: Phase 2: hosted saves import with a character pick
  (`junon-common/save_importer.js`, `server/util/tasks/import_save.js`), and
  the owner switches characters with `/character`. The import UI and an
  in-game menu come with the Phase 4 menus. The S3 export script (step 7) was
  dropped, because saves are already being exported.
- [x] 2026-10-07: Phase 3: PvP mode and the official minigames (Find the
  Imposter, Domination, Bed Wars, Tower Defense) are removed from the game
  server and client. The matchmaker's minigame code goes with the matchmaker
  in Phase 8.
- [ ] Phase 4: Local menus replace the matchmaker UI.
- [ ] Phase 5: Electron shell runs client and server process.
- [ ] Phase 6: Co-op hosting and joining.
- [ ] Phase 7: Singleplayer behavior (pause, autosave, save on quit).
- [ ] Phase 8: Remove hosted-service packages and dependencies; update docs.
- [ ] Phase 9: Packaging.

## Implementation

The browser build and `npm run serveronly` must keep working through Phase 4,
so the existing Jest and Playwright suites can still validate each step.

### Phase 1: standalone server

1. Add a world-storage module with a filesystem backend rooted at a
   configurable saves directory (env/CLI argument; Electron passes
   `app.getPath('userData')/saves`). Route every S3 read/write/list/delete in
   `world_serializer.js` and `game.js` through it, and also the dev/test path
   that keeps save bytes in the MySQL `sectors.data` column
   (`existsLocally`/`readLocally`). Keep file contents
   byte-compatible with what was uploaded to S3 (gzip'd `SaveState`).
2. Moved to Phase 4, the first consumer. The world list can come from the
   standalone `sectors` table (name, mode, owner, day count) plus each save's
   header (`WorldSerializer.getSaveMetadata`). No separate JSON index is
   needed.
3. Replace Firebase identity with a local profile: a UUID generated by the client
   once and persisted with a display name. The join payload sends it as `uid`
   with no `idToken`. `server.getUidFromRequest` already returns the
   client-supplied `uid` when there is no token, but only in `debugMode`. Make
   that the standalone behavior and delete the `idToken` branch of
   `performJoinGame` (its `User`/`IpBan` lookups). The server keys characters by
   this UUID.
   Done: `performJoinGame` has a standalone branch (`getLocalProfileUid`,
   `isValidLocalUsername`), and the hosted `idToken` branch stays until Phase 8.
   The client profile is `client/src/util/local_profile.js`: a dashless v4 UUID,
   kept in `localStorage`.
4. Turn `isMatchmakerDisabledForTest` into a proper standalone mode (it is no
   longer test-only). Default Sentry and prom-client to off.
   Done: the flag is `global.isMatchmakerDisabled`. Standalone also skips the
   DNS check, the Firebase port claim, the systemd index, the liveness socket,
   `/metrics` and `/toggle`, and the dev `/debug/:message` command route. It
   binds to `127.0.0.1` unless `JUNON_HOST` is set, never evicts its world for
   slow ticks or zero players, saves on `SIGINT`/`SIGTERM`, and logs unhandled
   rejections instead of exiting.
5. Done differently: standalone keeps the database layer on a SQLite file,
   `<JUNON_SAVES_DIR>/junon.sqlite` (see Decisions), instead of dropping it.
   The `sectors` row is the world registry and each local profile gets a
   `users` row, so existing model code (ATM balance, sector bans, team
   renames, day count) works unchanged. Hosted-only features (favorites,
   votes, friends) are inert offline. They go away with the matchmaker UI and
   Phase 8.
6. Add a temporary direct-connect entry to the browser client (for example
   `?server=ws://127.0.0.1:<port>&world=<id>`) that bypasses the matchmaker
   and opens `game_connection.js` against the given URL. Without it, nothing
   can reach a standalone server until Phase 4 replaces the menus. Phase 4
   replaces it with the real Host/Join menus.
   Done as `?server=ws://host:port&name=<name>`. The world id isn't needed
   because a standalone server resolves an id-less `RequestGame`/`ResumeGame`
   to its only world. See `Main#runStandalone` and
   [development.md](../../development.md#standalone-offline-mode).

### Phase 2: import old saves

1. Import accepts a `.sav` file (gzip'd protobuf). There is no
   upgrade-on-import step in the code: `world_serializer.js` reads the version
   from `save_header.proto` and decodes with that version's own schema, and the
   server's loader handles old fields. It already rejects versions below 3
   (`server.js` `createNormalGame`). Import therefore decodes with the file's
   own schema, rewrites identity fields (step 2), re-encodes with the same
   schema, and writes the result under a new local world id. The file's format
   version does not change.
2. Replace hosted-game identity while keeping characters:
   - Give every saved character a new opaque local id (`imported-<n>`) and
     rewrite it everywhere the old Firebase uid appears. In `save_v39` those
     fields are exactly: `Player.uid`, `PlayerData.uid`, `playerDataMap` keys,
     and `Team.creatorUid`/`Team.leaderUid`. Check older `save_vN` schemas for
     extra uid fields as each one is supported. Other string-keyed maps are not
     uids: `Team.deeds` and `permissions` are keyed by name, and
     activity/command logs by team id and store usernames. No Firebase uid
     remains, and characters keep their inventory, position, and stats.
     `OwnerRef` holds entity ids and is left unchanged.
3. World ownership. The importer's profile owns the world: the `sectors`
   registry row's `creatorUid`, which the import tool writes. Hosted servers
   also tied the main colony team to the world owner (`Team#isSectorOwner`:
   `team.creatorUid === game.creatorUid`). New players join that team, and the
   world name follows its name. The save doesn't record which team that was,
   so import picks the team named after the world (true for all 10 provided
   saves), else the team with the most characters, and sets its `creatorUid`
   to the importer. Without this, picking a character outside the main team
   would leave the world with no main colony, and joining friends would have
   no team to land in.
4. The importer picks a character, and that character's team becomes their
   team. Picking renames the character's `imported-<n>` id to the profile id
   (`PlayerData.uid`, `Player.uid`, `playerDataMap` key) along with any
   `Team.leaderUid` it held. Team creators don't move: the main team stays the
   owner's, and other teams keep their founder's id. Picking none is allowed
   (`--new`). A new character joins the main colony.
   Done: `SaveImporter.listCharacters`/`importSave`, run by the CLI
   `server/util/tasks/import_save.js` (list with `--search`, then
   `--character <name|id>` or `--new`). The CLI writes the save and registers
   the world in the standalone registry as owned by `--owner`.
5. The owner can switch characters later. Done as the owner-only,
   standalone-only `/character` chat command (`list [search]`, `<name>`,
   `new`), backed by `Game#switchCharacter`. The owner's player is removed
   (saved as player data, released as a new `imported-<n>`), the target's id
   becomes the profile id, and the owner joins again on the same connection
   (the client already handles a second `JoinGame`). Only `imported-<n>`
   characters can be taken. A client can't claim one by sending such an id as
   its profile id (`Game#getLocalProfileUid` rejects them). A saved character
   keeps its own name; new characters use the profile name, which the
   `users` row keeps. Guests join as fresh characters. Handing a saved
   character to a guest is a later option.
6. Done: import rejects game modes other than default/peaceful/survival/
   hardcore (hosted PvP/minigames).
7. Dropped: an operator-side S3 export script. Saves are already being
   exported, and it can't be tested without production credentials.

### Phase 3: remove PvP and minigames

1. Make the modes unreachable first: remove creation paths and menu entries, and
   have the importer reject them (Phase 2).
2. Delete `server/entities/minigames/`, `minigame_objectives.js`, round/endround
   commands, `pvp_explorer.js`, and matchmaker minigame handling.
3. Remove `isPvP()`/`isMiniGame()` branches module by module, keeping the
   non-PvP path. Run the focused Jest suites after each module.
4. Keep peaceful (sandbox) mode and command blocks. Command-block code is
   tangled up with minigames: `Sector#canUseCommandBlocks` becomes
   `isPeaceful()` only, and `importCommandBlockToEventHandler` loses its
   minigame check and its hard-coded hosted sector uids. Command blocks must
   still load from `commandBlockFullJson` in imported peaceful worlds.
5. Leave wire/save schema fields in place. Keep enum values and field numbers
   so that old saves still decode.

Done as follows. Server: `Game#isPvP`/`isMiniGame` and every branch on them,
the minigame classes and imposter objectives, `/endround`, minigame creation
and matchmaker join checks in `server.js`, PvP-only systems (character
restart, leave-team-and-respawn, delayed removal, playerData expiry, building
upgrades and build progress, PvP Firebase registry) and the imposter vote
system (`vote_manager.js`, vote messages, task counters). Client: the
minigame/PvP lobby (Games tab, mode entries, details panel, PvP explorer,
invites, imposter branding), `isPvP`/`isMiniGame`, the end-game, team-full and
vote menus, imposter HUD and terminal hacking, and their markup in
`main.ejs`. Hosted worlds saved in `pvp` mode would now load as ordinary
worlds. Import already rejects them, and standalone registration only accepts
peaceful/survival/hardcore (`default` counts as unset).

Kept, because they are general features, not PvP/minigame modes: the
`isPvPAllowed` world setting and region `pvp` flags; rounds started by command
blocks (a timer named `RoundStartTimer`, `RoundStarted` to clients); the
objectives system and `/objectives`; meeting music (`/playsound`); the radio,
emergency button and assassin's knife as items, so saves containing them still
load (their minigame-only behavior is gone).

Wire contract: the now-unused protobuf messages and fields (`StartRound`,
`RestartCharacter`, `LeaveTeam`, `SendVote`, `StartVote`/`EndVote`/
`VoteUpdated`, `EndGame`, `TeamFull`, `JoinGame.isMiniGame`/`fullMap`) stay
in the schema. Nothing sends them. A client that does gets a logged
"no handler" error (socket handler errors are caught and logged). Dead CSS
for the removed markup remains in `client/stylesheets/style.css`.

### Phase 4: local menus

Replace `game_explorer.js` with New world / Load world / Import / Host / Join
(address:port) menus. Remove the account, friends, favorites, voting, event
badge, and ban-appeal UI.

### Phase 5: Electron shell

1. New workspace package `packages/junon-desktop`. The main process serves the
   built client over a custom `app://` protocol. Use `contextIsolation: true`,
   no `nodeIntegration`, and a narrow preload API (start/stop server, list/
   import worlds, profile).
2. Run the game server in a separate process (`utilityProcess.fork`), not in the
   main process, because the server relies on process globals and init order.
3. Native modules: move the server socket layer from `uWebSockets.js` to `ws`
   (already a dependency) because uWS only ships Node-ABI binaries. Rebuild or
   remove `sharp` (`server/entities/sector.js`).

### Phase 6: co-op

1. "Open to LAN" rebinds the running server to `0.0.0.0:<port>` and shows the
   host's LAN address. Optional join password is checked in `performJoinGame`.
2. The host is the world owner/admin. Guests are untrusted network input, and
   the server stays authoritative.
3. On connect, check the protocol hash and show a clear version-mismatch error.
4. When the host quits: save, notify guests, then close.

### Phase 7: singleplayer behavior

Pause the simulation when the menu is open with a single local player, autosave
on an interval, and flush a save on `before-quit` before exiting.

### Phase 8: cleanup

Remove `junon-matchmaker`, `junon-io-watchdog`, `junon-common/db` and its
migrations, `aws-sdk`, `firebase*`, `mysql`/`mysql2`/`sequelize`, and the
S3/Firebase utility tasks. Rewrite `ARCHITECTURE.md`, `docs/development.md`,
`docs/deployment.md`, and `docs/testing.md`. Point the e2e harness at a local server.

### Phase 9: packaging

`electron-builder` for Windows, macOS, and Linux; code signing and notarization.

## Validation

- Per phase: focused Jest suites under `packages/junon-io/test/` for the
  touched subsystems (see [docs/testing.md](../../testing.md)).
- Phase 1: with no `.env`, no MySQL, and no network, `npm run serveronly` +
  `npm run client` can create a world through the direct-connect entry, save
  it, restart, and reload it with the same character. A Jest test covers
  filesystem storage: save, list, load, delete.
- Phase 2: `test/server/save_importer.test.js` builds synthetic hosted saves
  in formats v4, v20, v38 and v39. Real exported saves are player data, which
  AGENTS.md forbids committing. It asserts that no hosted uid remains, the
  chosen character carries the profile id and keeps its state, leadership
  follows the character, the main team is owned by the importer, and
  PvP/unknown modes are rejected. `test/server/character_switch.test.js`
  covers switching rules.
- Phase 2, manual: the import tool ran on all 10 provided saves (v36-v38, up
  to 327 characters). In headless Chrome on an imported 256x256 world:
  joined as the picked character, switched to another, listed, started a new
  character and switched back, with no page or server errors, no duplicated
  or lost characters (61/61 after a save), and the main team still the
  owner's.
- Phase 6: two clients (two Electron instances or Electron + browser) on one
  machine and across a LAN can join, play, disconnect, and resume.
- Playwright e2e suite green against the standalone server.

## Decisions

- 2026-09-28: Listen-server model that reuses the existing authoritative server.
  Alternative considered: rewrite as peer-to-peer or client-authoritative
  netcode. Rejected because the server is already authoritative and
  self-contained, and a rewrite would touch all gameplay code.
- 2026-09-28: Remove PvP and minigames entirely rather than porting them to
  local modes.
- 2026-09-28: Steam distribution/networking is out of scope. Internet co-op is
  direct IP (port forwarding or an overlay VPN such as Tailscale/ZeroTier).
  Not ruled out for the future; no transport abstraction is built for it now.
- 2026-09-28: Hosted-game saves must be importable. The on-disk save format stays
  the existing versioned protobuf `SaveState`. On import, Firebase uids are
  replaced with opaque local ids, and the importer picks a character. Their
  team is that character's team, and they can switch characters later. World
  ownership lives in local world metadata, not in team fields. Alternatives
  considered: dropping all saved characters (loses inventories); a separate
  team pick (rejected in favor of team following the character); inferring an
  owner team from building counts (can guess wrong).
- 2026-09-28: Game server runs in a separate process from the Electron main
  process, because of process globals and so a server crash does not take down the UI.
- 2026-10-07: Standalone is a new `NODE_ENV` value, not a flag on
  `development`. `debugMode` (development/test) changes gameplay: waves every
  5 s with 3 mobs, 5x build speed, faster fire, every player in admin mode
  (sandbox crafting), and the separate `app_debug.proto` wire format. Standalone
  must play like production, so `debugMode` stays off and only infrastructure
  branches check `env === 'standalone'`. The client follows `window.env`, so
  it also uses `app.proto`.
- 2026-10-07 (user decision): offline play uses SQLite in place of MySQL,
  keeping the Sequelize models and call sites, rather than removing the
  database layer. The file is `<JUNON_SAVES_DIR>/junon.sqlite`, shared by all
  worlds there. Its schema is built from the models
  (`junon-common/db/standalone_schema.js`: create missing tables, add new
  columns), because the migrations use raw MySQL SQL and must not be
  rewritten. `sqlite3` moved to `junon-common` dependencies. It is an N-API
  module, so its prebuilt binary should load under Electron without an ABI
  rebuild. Confirm in Phase 5. This replaces an earlier plan to use an empty
  in-memory SQLite stand-in and later delete the call sites.
- 2026-10-07: Imported worlds: the importer owns the world and its main
  colony team, and plays a chosen character from any team. Character ids and
  team leadership move with the character; team creators don't. Saved
  characters keep their own names. Alternatives considered: tying the main
  team to whichever character is picked (leaves worlds without a main colony
  when a non-founder is picked), and renaming taken-over characters to the
  profile name (released characters would all carry the owner's name).
- 2026-10-07: `JUNON_OWNER_UID` is required in standalone.
  `Team#isSectorOwner` compares a team's creator with the world owner, so with
  no owner every team saved without a creator counted as the owner, and team
  renames then renamed the world. The hosted comparison was left alone
  (anonymous hosted worlds may rely on it).
- 2026-10-07 (user decision): the ATM is a per-profile bank, matching the
  hosted cross-world account. With SQLite it is simply the profile's
  `users.gold`, using the hosted code path unchanged, shared by every world on
  the machine. In co-op a guest's balance lives on the host's machine and is
  separate per host. Guests can't bring their own balance, because their
  client would be trusted to report it. Alternatives considered: a per-world
  bank (loses the cross-world purpose), removing the ATM, and a separate
  `bank.json` (built, then dropped once SQLite made it redundant).

## Discoveries and risks

- `uWebSockets.js` is expected not to load under Electron's ABI. The plan
  replaces it with `ws`. Throughput is not a concern at co-op player counts.
- Character switching creates a new despawn/resume path for a live player.
  It reuses `Player#remove` (which saves the character) and the normal join
  path, both synchronous up to the rejoin, so an autosave can't capture a
  half-switched state. A save after switching held exactly the original
  characters.
- PvP/minigame removal touches about 164 call sites. Doing it after standalone
  mode works (Phase 3) keeps regressions attributable.
- Join-time identity is self-asserted (local UUID). A guest could impersonate
  another guest's character if they learn the UUID. This is acceptable for
  friends-only co-op; the optional join password limits exposure.
- Rollback: phases 1-4 keep the browser build working, so each phase can be
  reverted independently until Phase 8 removes the hosted services.
- 2026-10-07: Hosted-only state that saves don't carry. For a loaded world,
  the game mode and name came from the MySQL sector row. Standalone registers
  a `sectors` row from the save header on first start, then uses the row as
  hosted servers do. Two unguarded dereferences crashed or could crash a standalone
  server: `Sector#initBans` (on every load) and `Sector#removeScreenshot`
  (client-triggerable, so a guest could crash the host). Both are now guarded.
- 2026-10-07: `Game#isCreatedByAnonynmous` treats any UUIDv4 creator as
  anonymous, and `prepareRemove` permanently deletes anonymous worlds. It now
  returns false in standalone. Keep local profile ids out of that check if it
  is ever reused.
- 2026-10-07: Returning players are placed at their team spawn, a beacon, or
  next to a teammate, not where they logged off (`SurvivalSector#onPlayerJoin`).
  That matches the hosted game. Persistence checks should compare character
  state (inventory, stats, alive time), not position.
- 2026-10-07: ATM account gold was stored in the MySQL `users` row (a hosted
  bank shared across worlds, survival only). Resolved by the decision below.
  Hosted balances can't be imported because they never were in saves. The
  hosted ATM only answered the "balance" query in minigames, so in survival
  the balance appeared only after a transaction. Standalone answers the
  query.
- 2026-10-07: SQLite keeps millisecond timestamps where MySQL `DATETIME` keeps
  seconds. `Sector#createdAt` (ms / 1000) became fractional, the protobuf
  encode of the `uint32` field failed, and players couldn't join. It is now
  rounded down. Watch for the same thing in other database dates that reach
  the wire.
- 2026-10-07: Existing race, fixed in Phase 2 because every imported
  command-block world hit it on each join and switch. `Button#onStateChanged`
  broadcast `ButtonUpdated` to players whose client hadn't processed
  `JoinGame`, which threw in the client. Buttons also weren't part of the join
  snapshot at all, so late joiners never saw them. Now updates go only to
  ready players, and `Player#onPlayerReady` sends every button, like
  `sendAllRegions`.
- 2026-10-07: Imported worlds run their own command-block scripts. For
  example, "Generated survival world" runs `/team join $player $player` for
  every joining player, which moves them to a personal team. That is world
  content behaving as it did when hosted, not an import or switching bug.
- 2026-10-07: World thumbnails were disabled whenever `isOffline` was set
  (`Sector#replaceScreenshot`/`addScreenshot`), which showed the owner "Failed
  to take Screenshot". Standalone now stores them in
  `<JUNON_SAVES_DIR>/screenshots` and records them on the `sectors` row for
  the Phase 4 world list. This uses `sharp` (native), as noted for Phase 5.
- 2026-10-07: Phase 1 bug found in Phase 3: the standalone client boot
  skipped `Main#postInitSetup`, where the projectile object pools are created.
  Any projectile (turrets, command-block spikes) then threw "object pool ...
  not found". `Main#initProjectilePools` now runs on both paths.
- 2026-10-07: "Leave Colony" UI was always hidden by CSS, and its `LeaveTeam`
  message only did anything in PvP, so both were removed.
- 2026-10-07: Command-block JSON can't produce `function`/`forEach` actions,
  which `EventHandler#runActions` passes to `eval`. Command blocks are rebuilt
  through validated classes (`server/command_blocks/`) that only emit
  commands, if/then/else and timers. Only built-in minigame scripts (now
  deleted) used those `eval` paths. Keep it that way, because imported worlds
  and co-op guests are untrusted.
- 2026-10-07: `Game#onJoinGame` on the client clears the URL query
  (`history.replaceState`), so reloading the page after joining loses the
  temporary `?server=` parameter. Harmless until Phase 4 replaces direct
  connect.
- 2026-10-07: The provided hosted saves are format versions 36-38, with 15 to
  327 characters each, so character pickers need search (the CLI's
  `--search` and `/character list [search]` have it).

## Result

In progress. Phase 3 validation (2026-10-07): Jest 28 suites / 292 tests
pass; `npm run client:build` passes. The Playwright e2e suite (hosted lobby
via the real matchmaker, building, mining, combat, storage) passes 15/15 after
installing Playwright's Chromium (`npx playwright install chromium`). In
headless Chrome on imported worlds: a peaceful command-block world (buttons,
`/character` switch, turrets) and a survival world load and play with no page
or server errors. Phase 2 validation is under Validation above. Phase 1
validation (2026-10-07):

- Jest: 26 suites / 272 tests pass, including `test/server/standalone_storage`,
  `standalone_identity`, `standalone_schema`, `standalone_atm`, and
  `standalone_server` (boots a real standalone server, generates a world,
  checks its SQLite registry row, stops it with `SIGTERM`, checks the save,
  restarts, and checks the save is loaded). `npm run client:build` passes.
- After the SQLite switch, the client joined a new world in headless Chrome
  with no errors, and the profile's `users` row was created with its name.
- Manual, headless Chrome against the dev bundle: the client joins via
  `?server=`, renders terrain, gets the owner welcome for the matching profile,
  and shows no console errors on a fresh world. A character survived a server
  restart with the same uid, inventory, gold, team, and continued alive time,
  with no duplicate. A copied hosted save (v38, 256x256, 26k buildings, 53
  teams, command blocks) loaded and re-saved with all entity counts preserved.
