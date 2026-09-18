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

Some Jest suites are focused simulation tests; directories named `load_testing`
and `memleak` may be slow, stateful, or resource-intensive, and `npm test` does
not exclude them. Inspect a test before running it.

## Commands

From the repository root, run one focused suite:

```sh
npm exec --workspace packages/junon-io -- jest test/pressure/pressure.test.js --runInBand
```

Run the ordinary test tree while excluding explicitly heavy suites:

```sh
npm exec --workspace packages/junon-io -- jest test --runInBand \
  --testPathIgnorePatterns=/load_testing/ /memleak/
```

Run all discovered Jest tests only when the environment and task justify the
heavier checks:

```sh
npm exec --workspace packages/junon-io -- jest test --runInBand
```

Validate client bundling after browser, shared-game, asset, protocol, or Gulp
changes:

```sh
npm run client:build
```

## End-to-end tests

### What they run

`test/e2e/global-setup.js` boots the real stack as separate processes, the same
way local development does: the matchmaker (`packages/junon-matchmaker`), a gulp
watcher that builds the browser client, and the game server under `--inspect`.
Playwright then drives the actual browser client through the actual matchmaker
handshake. Nothing is stubbed.

A full run therefore costs a client build (up to two minutes on a cold cache)
plus roughly two minutes of tests, and each test creates and joins its own new
colony.

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
run, so a previous run still shutting down does not collide with the next.

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
| `support/join.js` | The real new-colony flow, and picking a game mode |
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
- The harness runs without MySQL, so `sector.createdAt` stays 0 and the
  "Choose a Game Mode" menu never opens by itself
  (`SelectDifficultyMenu#showGameMode` gates on it). `selectGameMode()` opens it
  and then drives it normally.
- A colony with no game mode picked is not peaceful. Most chat commands only run
  in a peaceful colony (`BaseCommand#canExecute`), and in a peaceful one the
  owner's crafts succeed without the ingredients
  (`Inventory#isSandboxMode`) - so a crafting test must *not* pick peaceful, and
  an admin-command test must.
- The two sides file terrain differently: the server keeps everything on
  `sector.groundMap`, the client puts foreground tiles (asteroids, rocks) on
  `sector.map` and walkable ground on `sector.groundMap`. The client has no
  `isMineable()`; it keys mining off `isForegroundTile()`.
- `Game#isHoldItemDeletedRecently` is already true before a player touches
  anything, and `storeInventorySlot()` consumes it as an early return, so the
  first attempt in a session to move an item from the inventory into a container
  is silently dropped. `storage.spec.js` retries rather than encoding the quirk.
- A mouse-down *toggles* mining mode. Mining also does not stop when a tile runs
  out - `player.mineTarget` still points at the removed entity until the cursor
  moves off it - so a second dig started without moving the cursor switches
  mining off instead of on.

## Validation by change type

| Change | Minimum useful validation |
| --- | --- |
| Pure server/game logic | Closest focused Jest suite; add a regression test |
| Client UI or assets | Client build plus the closest e2e spec, or a manual browser flow |
| Shared game entity/interface | Focused tests and client build; inspect both sides |
| Protobuf contract | Client build and affected server/client message flow |
| Save serialization | Round-trip fixtures across relevant format versions |
| Database model/migration | Migration on a disposable database and model path |
| Matchmaker/API | Focused request/socket reproduction with isolated dependencies |
| Startup/configuration | Start the affected service in the intended `NODE_ENV` |
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

At handoff, name the exact commands run and their outcomes. If MySQL, credentials,
native modules, browsers, or external services prevented validation, state that
constraint and the narrower checks that did run.
