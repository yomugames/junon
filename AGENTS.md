# Junon agent guide

This file is the entry point, not the complete manual. Keep durable knowledge in
`docs/` and update it in the same change as the behavior it describes.

## Start here

1. Read [docs/README.md](docs/README.md) for the documentation map.
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing package boundaries,
   protocols, persistence, networking, or startup behavior.
3. Read [docs/development.md](docs/development.md) before running the stack.
4. Use [docs/testing.md](docs/testing.md) to select the smallest useful checks.
5. For work spanning several subsystems or sessions, create an execution plan as
   described in [docs/exec-plans/README.md](docs/exec-plans/README.md).

## Repository map

- `start_server.js`: starts the game server and matchmaker in one process.
- `packages/junon-io/`: authoritative game server, browser client, shared game
  model, assets, build pipeline, and Jest tests.
- `packages/junon-matchmaker/`: player-facing HTTP/WebSocket matchmaking service.
- `packages/junon-common/`: database models and migrations, protobuf schemas,
  serialization, logging, and socket utilities shared by services.
- `packages/junon-io-watchdog/`: standalone game-server liveness watchdog.
- `docs/`: versioned engineering knowledge and execution plans.

## Working rules

- Inspect neighboring code before editing. This is a CommonJS codebase with old
  dependencies and established local conventions; do not introduce a new stack
  or broad modernization as part of an unrelated change.
- Keep changes narrow. Preserve public event names, serialized fields, entity
  names, and module paths unless the task explicitly includes a migration.
- Treat external input as untrusted at HTTP, WebSocket, command, protobuf, save,
  and database boundaries. Validate before state mutation.
- Never commit credentials, Firebase service-account data, Sentry DSNs, database
  passwords, production hostnames, or exported player data.
- Do not edit generated build output under `packages/junon-io/dist/` or
  `packages/junon-io/client/dist/`; change sources and rebuild.
- Database schema changes require a new migration. Do not rewrite a migration
  that may already have run.
- Protocol and save-format changes are compatibility-sensitive. Update all
  producers and consumers together and document the compatibility decision.
- The server relies on process globals and initialization order. Avoid adding new
  globals; if touching startup, verify both standalone workspace scripts and the
  combined root entry point where practical.
- A game concept often has server and client representations. Search both trees
  before declaring a gameplay change complete.
- Fix causes, not only symptoms. If a repeated failure exposes missing repository
  guidance or a check that can be automated, improve the relevant doc or tool in
  the same change.

## Standard commands

Run from the repository root unless noted otherwise.

```sh
npm install
npm run db:setup
npm run client
npm run serveronly
npm run matchmaker
npm run server
npm run client:build
```

Tests currently have no root npm alias. Run a focused Jest file through the game
workspace, for example:

```sh
npm exec --workspace packages/junon-io -- jest test/pressure/pressure.test.js --runInBand
```

See `docs/testing.md` for caveats and broader commands.

## Change workflow

1. Establish the current behavior and identify affected boundaries.
2. For a bug, reproduce it with the smallest deterministic test or procedure.
3. Implement the smallest coherent change, including callers and compatibility
   updates where a shared contract changes.
4. Run focused checks first, then the applicable build or broader test set.
5. Review the diff for secrets, generated files, accidental refactors, and stale
   documentation.
6. Report what was validated and what could not be validated, including missing
   services or credentials.

## Definition of done

- Behavior matches explicit acceptance criteria.
- Tests cover the changed logic where the existing harness can do so.
- The relevant client/server/shared contract remains consistent.
- Builds or focused tests pass, or limitations are stated precisely.
- `AGENTS.md`, `ARCHITECTURE.md`, and `docs/` remain accurate and linked.
- New durable decisions live in the repository, not only in a prompt or chat.
