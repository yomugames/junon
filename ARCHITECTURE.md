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
  | runs Steamworks, if available, and relays Steam co-op guests' frames
  | relays online co-op guests' frames from a hidden WebRTC window
  v
utility process: game server <------> saves dir (sector.sav files + SQLite)
  ^                                  ^
  | game WebSocket                   | guest WebSocket, while hosting co-op
  | (ws://127.0.0.1:<free port>)     | (ws://0.0.0.0:<host port>, password proof)
renderer: game client                other players' clients

online co-op: host's hidden window <-- WebRTC data channel --> guest's game page
                         \                                   /
                          `-- junon-signal (room codes, offers, ICE) --'
```

The same server also runs without Electron (`npm run server`). It then serves
the client to a browser from a loopback page server, whose `/local/*` routes
replace the preload IPC.

`NODE_ENV` only selects gameplay settings: `standalone` plays like the released
game (the desktop app uses it), while `development` and `test` turn on
`debugMode` (fast waves and building, admin mode, and the `app_debug.proto` wire
format).

The local world menu lists, creates, opens and imports worlds, and starts the
tutorial, through `Server#getLocalWorldApi`, then joins the selected world over
the game WebSocket. Players are identified by a local profile id that the client
generates and keeps in `localStorage`. Its layout is described in
[docs/homepage.md](docs/homepage.md).

Co-op is a listen server. Hosting (`hostWorld`) opens a second listener on all
interfaces at a port the host picks. Sockets from it are marked `isGuest`;
their upgrade must carry the server's protocol hash and, if the world has a
password, an answer to a single-use challenge from `/info` (the password itself
is never sent), and they can't join with the owner's profile id. The host keeps playing over
loopback, which guests can't reach. Clients check a host's `/info` endpoint
before connecting, to report version and password problems. Hosting ends when
the host stops it, switches worlds or quits; guests then get a `PlayerKick` with
a reason.

Steam co-op (in progress, [plan](docs/exec-plans/active/steam-coop.md)) uses
Steam Networking Sockets P2P instead of a guest listener. Steamworks runs only
in the Electron main process (`junon-desktop/src/steam.js`), and the game server
never loads it. Friends find and join the world through a Steam lobby
(`steam_lobby.js`) that main creates when the server reports Steam hosting;
the lobby data carries the protocol hash, so a guest on another version is
told before connecting. On the host, `steam_host.js` accepts Steam
connections from lobby members only and relays whole frames to the server over the parent port, where
`server/util/steam_socket_bridge.js` turns each one into a guest socket with
the same shape as a `ws` one (`isGuest`, `remoteAddress` `steam:<id>`). On the
guest, `steam_guest.js` carries the renderer's game socket
(`client/src/util/steam_socket.js`, for `steam:<id>` URLs) through preload.
`junon-common/steam_framing.js` defines the framing: fragments under Steam's
512 KB message limit, plus a control hello with the transport version and
protocol hash that the host checks before any game message.

Online co-op (in progress, [plan](docs/exec-plans/active/webrtc-coop.md)) is
for builds without Steam: friends join with a room code over WebRTC. The
signalling server (`packages/junon-signal`, run by us) pairs host and guest
and relays their offers and ICE candidates; game traffic goes peer to peer. On
the host, Electron main has no WebRTC, so `junon-desktop/src/rtc_host.js`
opens a hidden window (`src/rtc_host/`) that holds the room and the peer
connections, and main relays frames to the server, where
`server/util/rtc_socket_bridge.js` makes guest sockets (`isRtc`,
`remoteAddress` the guest's IP). Both bridges share
`server/util/relay_socket_bridge.js`. On the guest, the game page's own
`client/src/util/rtc_socket.js` carries the game socket for `rtc:<code>` URLs.
Online co-op shows only when the desktop app knows a signalling server
(`JUNON_SIGNAL_URL`, or a release default).

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

### `packages/junon-signal`

The WebRTC signalling server for online co-op: rooms with short codes, relayed
offers, answers and ICE candidates, and the STUN/TURN servers handed to both
peers. Two implementations of one protocol, sharing `src/protocol.mjs`: a
Cloudflare Worker with a Durable Object per room (`worker/index.mjs`, the
production target) and a standalone Node `ws` server (`src/signal_server.js`)
for development, tests and self-hosting. No other workspace dependency;
deployed apart from the game. It keeps no game data.

### `packages/junon-desktop`

The Electron shell. `src/main.js` serves the client built with
`NODE_ENV=standalone npm run client:build` (`packages/junon-io/dist/`) over the
`app://` protocol, and opens a sandboxed, context-isolated window.
`src/server_process.js` runs `junon-io/server/server.js` in an Electron utility
process, with saves in `<userData>/saves`, and asks it to save and exit when the
app quits. `src/preload.js` exposes the only privileged renderer API: the local
world API, Steam co-op sockets and the signalling server's address.
`src/steam*.js` hold the optional Steam integration, `src/rtc_host*` the host
side of online co-op. The server reaches main through `server/util/desktop_channel.js`,
which tests can also back with Node IPC (`JUNON_DESKTOP_IPC=1`).

## Important contracts

- The game server is authoritative for simulation state.
- Protobuf files and the protocol hash couple client and server builds. Co-op
  guests must run a build with the host's protocol hash.
- Steam co-op adds `STEAM_TRANSPORT_VERSION` (`junon-common/steam_framing.js`),
  which the guest's hello carries and the host checks. Bump it when the
  framing or the control messages change. The parent-port messages between
  main and the server (`steamOpen`, `steamFrame`, `steamClose`,
  `steamHosting`) are documented in `server/util/steam_socket_bridge.js`.
- Online co-op adds `RTC_TRANSPORT_VERSION` and `SIGNAL_PROTOCOL_VERSION`
  (`junon-common/rtc_transport.js`). The first is checked like the Steam
  one. The second must match `packages/junon-signal`, whose protocol is
  documented at the top of `src/signal_server.js` (including the
  `?v=&role=&code=` query the Worker routes by); released games keep
  talking to the deployed server, so change it only compatibly, or run both
  versions. The main-server messages (`rtcOpen`, `rtcFrame`, `rtcClose`,
  `rtcHosting`, `rtcRoom`, `rtcHostingFailed`) are documented in
  `server/util/rtc_socket_bridge.js` and `junon-desktop/src/rtc_host.js`.
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
network service; online co-op needs the signalling server, only to connect. Sentry reporting is off unless `JUNON_SERVER_SENTRY_DSN` is set
outside `development`/`test`. Steam is optional and off unless `JUNON_STEAM=1`; without the Steam client or
the Steamworks redistributables, the desktop app runs without Steam features
(see [docs/development.md](docs/development.md#steam)).

The game server loads the repository-root `.env` file at startup; the file is
local-only.

## Where to record change

- Amend this file for package, dependency, contract, or runtime-topology changes.
- Put setup and command changes in `docs/development.md`.
- Put verification changes in `docs/testing.md`.
- Use `docs/exec-plans/` for substantial migrations and cross-cutting work.
