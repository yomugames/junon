# Testing and validation

## Current state

Two independent suites live under `packages/junon-io/test/`:

- Jest 29 unit and simulation tests, everywhere except `test/e2e/`. Run with
  `npm test` (root) or `npm test --workspace packages/junon-io`, both of which
  are `jest` with no arguments.
- Playwright end-to-end tests in `test/e2e/*.spec.js`, run with
  `npm run test:e2e --workspace packages/junon-io`. Jest is configured to ignore
  that directory (`jest.config.js` `testPathIgnorePatterns`) because those files
  use Playwright's own `test()`/`expect()`.

There is no repository-level lint command. Do not claim a lint suite passed.

Some Jest suites boot a real game server (`test/server/standalone_server.test.js`)
and take tens of seconds; the rest are focused unit and simulation tests.

## Commands

From the repository root, run one focused suite:

```sh
npm exec --workspace packages/junon-io -- jest test/pressure/pressure.test.js --runInBand
```

Run the whole Jest tree (the Playwright specs are excluded by `jest.config.js`):

```sh
npm exec --workspace packages/junon-io -- jest test --runInBand
```

Validate client bundling after browser, shared-game, asset, protocol, or Gulp
changes:

```sh
npm run client:build
```

## End-to-end tests

Playwright's own Chromium must be installed once per machine
(`npm exec --workspace packages/junon-io -- playwright install chromium`).
Without it, every e2e test fails to launch a browser.

### What they run

`test/e2e/global-setup.js` boots the real stack as separate processes, the same
way local development does: a gulp watcher that builds the browser client, and
the game server (`NODE_ENV=test`, so `debugMode` gameplay, with a temporary
saves directory) under `--inspect`, with no world loaded. Each test creates and
joins its own new world through the local world menu (`support/join.js`); the
server replaces the previous one. Nothing is stubbed.

A full run therefore costs a client build (up to two minutes on a cold cache)
plus a few minutes of tests.

```sh
npm run test:e2e --workspace packages/junon-io

# one file
npm exec --workspace packages/junon-io -- playwright test mining.spec.js

# keep a video per test even when the run passes (the gameplay is drawn to a
# canvas, so a recording is the only artifact that shows the world itself)
JUNON_E2E_VIDEO=on npm run test:e2e --workspace packages/junon-io
```

Videos, traces and screenshots land in `/tmp/junon-io-e2e`
(`JUNON_E2E_OUTPUT_DIR` overrides it); the path is printed at the start and end
of every run. Ports for the game socket and the inspector are randomised per
run, so a previous run still shutting down does not collide with the next. The
page server uses 8001; if another process holds it, the run stops with a clear
error, and `JUNON_E2E_CLIENT_PORT` picks another port.

### How scenarios are set up

Tests need real server-side state - ground the player can walk on, a mob to
fight, an asteroid to mine, materials to craft with - none of which the browser
can see or change. Rather than shipping test-only debug commands inside the game
server, the harness attaches to the game server's V8 inspector over the Chrome
DevTools Protocol and evaluates code inside that process
(`test/e2e/support/server_console.js`). The game server ships with no knowledge
that a test suite exists.

Support modules:

| Module | Responsibility |
| --- | --- |
| `support/server_console.js` | Attaches to the game server's inspector; `evaluateInServer(fn, arg)` runs `fn` in the server process |
| `support/scenario.js` | Scenario setup and server-authoritative reads (clear ground, terrain, items, inventory, storage, structures) |
| `support/screen.js` | World coordinate to browser cursor position, for the actions that are aimed with the mouse |
| `support/join.js` | The real New world flow of the local menu, with a game mode |
| `support/combat.js` | Walking up to a mob and swinging at it, entirely inside the page |

Functions passed to `evaluateInServer` are serialised, so each one closes over
nothing and repeats its own `global.server.getGame(sectorId).sector` preamble.
That is inherent to the transport.

Assertions read server state (`readInventory`, `readStructure`, `readTerrain`,
`readStorage`, `readMob`) rather than `window.player`, so a green test means the
server really applied the change instead of the client having predicted it.

### Behaviour worth knowing before writing one

- Mouse-aimed actions (mining, building placement, interacting) resolve off
  where the cursor is, not off an entity id, so they need a real cursor position
  from `support/screen.js`. They also all fail silently while a modal menu is
  open, because `Game#isModalMenuOpen()` makes `triggerEntityMouseEvents()` bail
  out.
- Under `NODE_ENV=test` every player starts in admin mode, in which the colony
  owner crafts without ingredients. `disableAdminMode(page)` switches it off.
- `createNewColonyAndJoin(page, { gameMode })` creates a `survival` world
  unless told otherwise. Most chat commands only run in a peaceful colony
  (`BaseCommand#canExecute`), and in a peaceful one the owner's crafts succeed
  without the ingredients (`Inventory#isSandboxMode`) - so a crafting test must
  *not* pick peaceful, and an admin-command test must.
- The two sides file terrain differently: the server keeps everything on
  `sector.groundMap`, the client puts foreground tiles (asteroids, rocks) on
  `sector.map` and walkable ground on `sector.groundMap`. The client has no
  `isMineable()`; it keys mining off `isForegroundTile()`.
- A mouse-down *toggles* mining mode. Mining also does not stop when a tile runs
  out - `player.mineTarget` still points at the removed entity until the cursor
  moves off it - so a second dig started without moving the cursor switches
  mining off instead of on.

### Desktop e2e

`packages/junon-desktop/test/desktop.spec.js` launches the Electron app with
Playwright against a temporary user-data directory. It creates a world through
the local menu, joins it, quits (which saves), relaunches, and loads the world
again, and checks that the world clock stops while the in-game menu is open.
A second test runs two instances: one hosts co-op with a password, the
other joins through a non-loopback address of the machine (rejected with a wrong
password first), loads the world thumbnail from the host, reconnects after its
socket drops, quits, rejoins, and is told when the host quits. A third
switches the language and checks it is kept after a restart. It needs the
standalone client build. A Linux machine without a display
needs `xvfb-run`; the test enables software WebGL itself.

```sh
NODE_ENV=standalone npm run client:build
xvfb-run -a npm run test:e2e --workspace packages/junon-desktop
```

To look at a UI change in the real app, `scripts/screenshot.js` launches it the
same way, creates and plays a world, and saves PNGs (options at the top of the
script). `--online` hosts the world against a signalling server started in the
script's process, and `--colony-menu` opens the colony menu, for example to see
the owner's room code:

```sh
NODE_ENV=standalone npm run client:build
xvfb-run -a npm run screenshot --workspace packages/junon-desktop -- --online --colony-menu --copy --out /tmp/shots

# show the visibility dropdown in the colony menu and hosting panel
xvfb-run -a npm run screenshot --workspace packages/junon-desktop -- --online --colony-menu --public --hosting-menu --out /tmp/shots

# show the public room browser before and after making the room private
xvfb-run -a npm run screenshot --workspace packages/junon-desktop -- --online --colony-menu --public --join-menu --out /tmp/shots
```

The desktop tests run with `JUNON_STEAM=0`. They check that the Steam preload
API reports Steam as unavailable and refuses to host or connect.
`test/steam_relay.spec.js` runs in Node, without Electron: it puts the
main-process Steam code (`src/steam.js`, `steam_lobby.js`, `steam_host.js`,
`steam_guest.js`) on an in-memory Steam (`test/support/fake_steam.js`), with a
real game server behind the host, and covers the lobby and its data, the
friends-hosting list, refusing connections from outside the lobby, invites,
the hello and version refusal, joining, a full Steam send buffer, and the end
of hosting. The desktop test "hosts on Steam, invites friends and joins a
friend from the menu" runs the app on the same fake Steam
(`JUNON_STEAM_FAKE_SDK`) to cover the menus, join requests and an invite that
starts the game; its friend lives in the app's process, so that test stops
at the version check. Real Steam can only be checked by hand
([steam-coop.md](exec-plans/active/steam-coop.md#validation)).

The desktop test "hosts online with a room code, and a second instance joins
over WebRTC" starts a signalling server (`packages/junon-signal`) in the test
process with no STUN servers and runs two app instances against it, so the
data channel is real WebRTC between local addresses and nothing leaves the
machine. It runs twice: with the Node server, and with the Cloudflare Worker
in `workerd` through Miniflare (`junon-signal/testing.js`). Other desktop tests run with `JUNON_SIGNAL_URL=off`, so they never reach the
deployed signalling server, and check that online co-op is unavailable. Connections across real networks and NATs can
only be checked by hand
([webrtc-coop.md](exec-plans/active/webrtc-coop.md#validation)).
The same test checks that rooms start Private, become visible in the public
browser when the host switches to Public, and disappear when switched back.
The shared signalling suite checks visibility, code joins, and bounded room
details on both backends. The desktop online co-op test checks the public
directory's player count and saved screenshot preview through the real game
server and room browser.

`test/packaged.spec.js` runs a packaged build
([development.md](development.md#packaging)) instead of the sources. It
creates and saves a world, which checks that the packaged server finds its
files and native modules. The test is skipped unless `JUNON_PACKAGED_APP` points
at the packaged executable. It can only run a build for the machine it runs on;
a Windows build made on Linux has to be checked on Windows.

```sh
npm run desktop:package
JUNON_PACKAGED_APP=release/linux-unpacked/junon-desktop xvfb-run -a npm run test:e2e --workspace packages/junon-desktop -- test/packaged.spec.js
```

## Validation by change type

| Change | Minimum useful validation |
| --- | --- |
| Pure server/game logic | Closest focused Jest suite; add a regression test |
| Client UI or assets | Client build plus the closest e2e spec, or a manual browser flow |
| Shared game entity/interface | Focused tests and client build; inspect both sides |
| Protobuf contract | Client build and affected server/client message flow |
| Save serialization | Round-trip fixtures across relevant format versions. Build synthetic saves (as `test/server/save_importer.test.js` does); real exported saves are player data and must not be committed |
| Database model | `test/server/standalone_schema.test.js`, and a server start against a saves directory created before the change |
| Startup/configuration | Start the server in the intended `NODE_ENV` (`standalone`, and `development` for `npm run server`) |
| Server runtime, local menu, co-op | `test/server/standalone_*.test.js`; `standalone_server.test.js` boots a real server, checks save/reload, exercises the local world and import HTTP routes, checks the `ws` game socket, and covers co-op hosting (preflight, password challenge and proof, replay and throttling, guest upgrade checks, owner-profile refusal, stop and shutdown notices), world thumbnails, and the singleplayer pause |
| Steam co-op transport | `test/server/steam_framing.test.js` (fragmentation, malformed input, send back-pressure) and `test/server/steam_coop.test.js` (forks the server with `JUNON_DESKTOP_IPC=1` and plays the desktop main process: hello and version check, Steam guests joining, owner-profile refusal, stop and shutdown notices), then `packages/junon-desktop/test/steam_relay.spec.js` |
| Online co-op (WebRTC) | `npm test --workspace packages/junon-signal` (Node's test runner, one suite run against the Node server and the Cloudflare Worker in `workerd`: pairing, lookups, public visibility and directory, keepalive, throttling, room resume and expiry, guest lifetime, TURN credentials), `test/server/steam_coop.test.js` (the WebRTC case: `rtcHosting`, `rtcRoom`, hello check, guest addresses), then the desktop online co-op test |
| Desktop shell (`packages/junon-desktop`) | `NODE_ENV=standalone npm run client:build`, then the desktop e2e test (see below) |
| Player-facing flow across client and server | The closest `test/e2e` spec, or a new one |

## Writing tests

- Reproduce the failure before fixing a bug when practical.
- Keep unit-like tests deterministic; avoid timers, public networks, and shared
  production services.
- Test contract boundaries and compatibility, not private implementation details.
- Place tests near the existing subsystem directory under `test/`.
- Do not weaken or skip an existing assertion merely to make a change pass.
- Many `common/interfaces/*.js` mixins ship default stub methods (e.g.
  `bounding_box.js#getX` throws, `container.js#onComponentAdded` is a no-op)
  that share a name with the override a test fixture needs to supply. If the
  fixture class defines that method in its own body and then does
  `Object.assign(Fixture.prototype, Mixin.prototype)`, the mixin's stub wins
  and silently shadows the fixture's real implementation. Apply overrides in
  the same `Object.assign` call, after the mixin, e.g.:
  ```js
  Object.assign(Fixture.prototype, Mixin.prototype, {
    getX() { return this.x },
    getY() { return this.y }
  })
  ```

## Reporting

At handoff, name the exact commands run and their outcomes. If native modules,
browsers, a display, or a second machine prevented validation, state that
constraint and the narrower checks that did run.
