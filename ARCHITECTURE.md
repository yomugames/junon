# Architecture

This is the high-level map of Junon. It records the architecture visible in the
repository today; it is not a proposal to redesign the system.

## System context

Junon is a multiplayer survival game composed of a browser client, authoritative
game servers, a matchmaker/API service, shared persistence and wire-contract
code, and a game-server liveness watchdog.

```text
Browser client
  | player HTTP/WebSocket traffic
  v
Matchmaker/API <------> MySQL / Firebase / AWS
  | allocates and tracks sectors
  v
Authoritative game server <------> MySQL / Firebase / AWS
  |
  +-- shared protobuf and save formats
```

In development, `start_server.js` constructs both the game server and matchmaker.
The workspace scripts can also start them independently.

## Packages and responsibilities

### `packages/junon-io`

- `server/server.js` initializes the authoritative runtime, networking,
  persistence, metrics, protocols, and game instances.
- `server/entities/` contains server-side game state and behavior.
- `server/commands/` contains command handlers.
- `server/ai/`, `server/interfaces/`, and `server/util/` support simulation logic.
- `client/src/` is the browser application; `client/assets/` and
  `client/stylesheets/` contain static presentation resources.
- `common/` contains game concepts used by both sides, including interfaces,
  constants, translations, and entity definitions.
- `gulpfile.js` builds and serves the browser bundle.
- `test/` contains Jest suites, including unit-like simulation tests and heavier
  load/memory tests.

### `packages/junon-matchmaker`

The matchmaker exposes player-facing endpoints and WebSockets, authenticates and
tracks players, maintains game-server connections, assigns sectors, and performs
environment/region scaling. `src/index.js` contains the main service class;
`src/server.js` is a thin runner.

### `packages/junon-common`

This package is shared infrastructure:

- `db/`: Sequelize models, configuration, and append-only migrations.
- `protocol/`: protobuf wire schemas and versioned world-save schemas.
- `world_serializer.js`: initialization and conversion of persisted worlds.
- `socket_util.js`: common text/binary WebSocket framing and dispatch.
- logging, validation, exception reporting, and configuration helpers.

Changes here have the widest blast radius and must be checked against both
runtime services and the browser/game shared code.

### `packages/junon-io-watchdog`

A separately started process that probes the game-server liveness sockets and
restarts only unresponsive systemd workers. It is not part of the deployment
or revision-rollout path.

## Important contracts

- The game server is authoritative for simulation state.
- Protobuf files and the protocol hash couple client and server builds.
- Files under `protocol/save_formats/` preserve historical persisted-world
  compatibility; add a version rather than silently changing an old format.
- Sequelize migrations are the database history; models describe current access.
- WebSocket event names and payload shapes are public runtime contracts even when
  JavaScript does not express them as types.
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

Local full-stack development requires Node.js 20.9.0, npm workspaces, and MySQL.
Firebase, AWS, Sentry, DNS, and production host metadata are environment-specific.
Development paths bypass or default some integrations; do not assume a successful
local boot proves production integration behavior.

## Where to record change

- Amend this file for package, dependency, contract, or runtime-topology changes.
- Put setup and command changes in `docs/development.md`.
- Put verification changes in `docs/testing.md`.
- Use `docs/exec-plans/` for substantial migrations and cross-cutting work.
