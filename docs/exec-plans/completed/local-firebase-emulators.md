# Outcome

Development uses local Firebase Auth and Realtime Database emulators without cloud
credentials, while local MySQL users and sectors remain enabled.

## Context

The prior development default set process-wide `isOffline`, which also skips SQL
sector creation. Both services and the browser must use the same demo project.
See ../../development.md and ../../../ARCHITECTURE.md.

## Progress

- [x] 2026-10-22: Inspect initialization, authentication, SQL creation and saves.
- [x] 2026-10-22: Configure loopback emulators, both services and legacy client.
- [x] 2026-10-22: Verify token identity, SQL accounts/owned and guest sectors,
  client SDK/database namespace, build, missing-emulator failure, CLI startup/export.

## Implementation

Use a fixed loopback demo project in development; retain isolated test/offline
behavior and existing staging/production configuration. Remove development DNS
fallbacks. Add local launcher, documentation, and regression coverage.

## Validation

Focused Jest checks, client build, emulator-backed authentication/database and SQL
creation smoke checks, and standalone/combined startup where available.

## Decisions

- 2026-10-22: Development always uses emulators; JUNON_USE_FIREBASE is retired.
  This keeps browser and services aligned without embedding server-only env vars.

## Discoveries and risks

Installed legacy Auth SDK supports useEmulator; SDK email/password login and
authenticated client database writes passed. Interactive provider popup remains
unverified: Playwright launch was denied by the macOS sandbox, Chrome was not
available to Computer Use, and access to Brave was not approved.
Emulator identities must be retained alongside SQL data to preserve ownership.

## Result

Development no longer sets `isOffline` or probes public DNS. Both service runners
check local emulator availability before running. Both development auth paths
verify token identities; remote production behavior and isolated tests remain.
No protocol or schema migration is required. `JUNON_USE_FIREBASE` is retired.

Validation passed:
- `npm exec --workspace packages/junon-io -- jest test/server/firebase_offline.test.js --runInBand`: 7 tests.
- `npm run test:firebase`: one integration scenario, with real local emulators,
  legacy client SDK login/write, both service verifiers, real account HTTP handler,
  owned and guest SQL colony creation, and Admin database write/read.
- `npm run client:build` and `git diff --check`.
- `npm run firebase:emulators`: first startup without retained data and graceful
  export to ignored `.firebase-data/`.
- `NODE_ENV=development node start_server.js` with unavailable emulators exits
  with the actionable setup message before SQL queries.

The Firebase commands used XDG_CONFIG_HOME=/tmp/junon-firebase-config and
FIREBASE_EMULATORS_PATH=/tmp/junon-firebase-emulators to keep tooling writes in
sandbox-writable locations. npm install used --cache /tmp/junon-npm-cache.

MySQL was unavailable, and initializing a disposable local mysqld crashed with
SIGSEGV. SQL integration assertions therefore used disposable SQLite, not the
local development database. Full standalone/combined MySQL-backed runtime and
interactive provider-popup sign-in remain manual checks. An untracked `.dev-saves/`
directory containing an old SQLite database and world save was removed at the
user's request; current development uses MySQL and the existing temporary save path.
