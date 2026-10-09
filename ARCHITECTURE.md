# Architecture

This is the high-level map of Junon. It records the architecture visible in the
repository today; it is not a proposal to redesign the system.

## System context

Junon is an offline-first desktop survival game with co-op listen servers. The
history of how it got here (it was a hosted browser game with a matchmaker,
MySQL, Firebase and S3) is in the
[execution plan](docs/exec-plans/active/electron-offline-coop.md).

Each world runs on an authoritative game server on the player's machine. The
server hosts one world at a time, stores it as a file in a saves directory with
a SQLite registry, and needs no network service. Singleplayer is that server on
loopback; co-op opens a second listener for other players.

```text
Electron main process (packages/junon-desktop)
  | serves the client build as app://junon/
  | relays preload IPC (window.junonDesktop) to the server's parent port
  v
utility process: game server <------> saves dir (sector.sav files + SQLite)
  ^                                  ^
  | game WebSocket                   | guest WebSocket, while hosting co-op
  | (ws://127.0.0.1:<free port>)     | (ws://0.0.0.0:<host port>, password)
renderer: game client                other players' clients
```

The same server also runs without Electron (`npm run server`). It then serves
the client to a browser from a loopback page server, whose `/local/*` routes
replace the preload IPC.

`NODE_ENV` only selects gameplay settings: `standalone` plays like the released
game (the desktop app uses it), while `development` and `test` turn on
`debugMode` (fast waves and building, admin mode, and the `app_debug.proto` wire
format).

The local world menu lists, creates, opens and imports worlds through
`Server#getLocalWorldApi`, then joins the selected world over the game
WebSocket. Players are identified by a local profile id that the client
generates and keeps in `localStorage`.

Co-op is a listen server. Hosting (`hostWorld`) opens a second listener on all
interfaces at a port the host picks. Sockets from it are marked `isGuest`;
their upgrade must carry the server's protocol hash and the optional password,
and they can't join with the owner's profile id. The host keeps playing over
loopback, which guests can't reach. Clients check a host's `/info` endpoint
before connecting, to report version and password problems. Hosting ends when
the host stops it, switches worlds or quits; guests then get a `PlayerKick` with
a reason.

## Packages and responsibilities

### `packages/junon-io`

- `server/server.js` initializes the authoritative runtime: the game socket
  (`server/util/standalone_socket_server.js`, on `ws`), the page server, the
  local world API, co-op hosting, and the world's lifecycle (load, autosave,
  save on exit).
- `server/entities/` contains server-side game state and behavior.
- `server/commands/` contains command handlers.
- `server/ai/`, `server/interfaces/`, and `server/util/` support simulation
  logic. `server/util/tasks/import_save.js` imports a hosted save from the
  command line.
- `client/src/` is the game client; `client/assets/` and `client/stylesheets/`
  contain static presentation resources.
- `common/` contains game concepts used by both sides, including interfaces,
  constants, translations, and entity definitions.
- `gulpfile.js` builds and serves the client bundle.
- `test/` contains Jest suites, including unit-like simulation tests and heavier
  load/memory tests, and the Playwright e2e suite.

### `packages/junon-common`

This package is shared infrastructure:

- `db/`: Sequelize models on SQLite. The schema is built from the models at
  startup (`db/standalone_schema.js`); there are no migrations.
- `protocol/`: protobuf wire schemas and versioned world-save schemas.
- `world_serializer.js`: reading and writing world saves in the saves directory.
- `save_importer.js` and `standalone_worlds.js`: hosted-save import and the
  world registry.
- `socket_util.js`: common text/binary WebSocket framing and dispatch.
- logging, validation, exception reporting, and configuration helpers.

Changes here have the widest blast radius and must be checked against the game
server, the client and the shared game code.

### `packages/junon-desktop`

The Electron shell. `src/main.js` serves the client built with
`NODE_ENV=standalone npm run client:build` (`packages/junon-io/dist/`) over the
`app://` protocol, and opens a sandboxed, context-isolated window.
`src/server_process.js` runs `junon-io/server/server.js` in an Electron utility
process, with saves in `<userData>/saves`, and asks it to save and exit when the
app quits. `src/preload.js` exposes the only privileged renderer API, the local
world API.

## Important contracts

- The game server is authoritative for simulation state.
- Protobuf files and the protocol hash couple client and server builds. Co-op
  guests must run a build with the host's protocol hash.
- Files under `protocol/save_formats/` preserve historical persisted-world
  compatibility, including saves exported from the hosted game; add a version
  rather than silently changing an old format.
- The SQLite schema follows the models and only grows automatically (new
  tables and columns). Renaming or removing a column needs an explicit step in
  `db/standalone_schema.js`, because players' existing database files must keep
  working.
- WebSocket event names and payload shapes are public runtime contracts even when
  JavaScript does not express them as types. Messages of removed hosted features
  stay in the schema so field numbers are never reused.
- Entity concepts may be mirrored in `client`, `server`, and `common`. A change to
  one representation may require corresponding changes to the others.

## Dependency direction

The current repository is not mechanically layered. For new code, prefer this
direction unless existing subsystem design requires otherwise:

```text
entry points -> service/runtime code -> shared game/domain helpers
             -> junon-common contracts and persistence
```

Keep browser-only dependencies out of server/shared modules and infrastructure
details out of portable game-domain helpers. Circular package dependencies and
new process globals require explicit justification in an execution plan.

## Runtime dependencies

Development requires Node.js 26.4.0 and npm workspaces. The game needs no
network service. Sentry reporting is off unless `JUNON_SERVER_SENTRY_DSN` is set
outside `development`/`test`.

The game server loads the repository-root `.env` file at startup; the file is
local-only.

## Where to record change

- Amend this file for package, dependency, contract, or runtime-topology changes.
- Put setup and command changes in `docs/development.md`.
- Put verification changes in `docs/testing.md`.
- Use `docs/exec-plans/` for substantial migrations and cross-cutting work.
