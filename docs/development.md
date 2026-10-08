# Development

## Prerequisites

- Node.js 26.4.0 (declared by the root `.nvmrc`)
- npm with workspace support
- MySQL for database-backed paths
- system libraries required by native npm dependencies such as `sharp` and
  `uWebSockets.js`

The workspace `.nvmrc` files match the root Node.js version, so workspace and
root commands use the same runtime.

## Install and database setup

From the repository root:

```sh
npm install
npm run db:setup
```

Database setup uses Sequelize configuration in `packages/junon-common/db/`.
The existing development default assumes a local MySQL root user; use the
supported environment configuration for non-default credentials and never commit
real credentials.

## Dependencies

`npm audit` is expected to run clean of critical advisories. Several entries in
the workspace manifests are declared but never required (they only widened the
vulnerable surface), so before upgrading a flagged package, check whether
anything imports it at all - removing a dead entry is preferable to bumping it.

Adding an entry to the root `overrides` block is not enough on its own. npm
keeps the resolution already recorded in `package-lock.json` and reports the
stale copy as `invalid` rather than re-resolving it, which is how a previous
`form-data` override sat in `package.json` without ever taking effect. After
editing `overrides`, delete the affected `node_modules/<pkg>` entries from
`package-lock.json` (and the matching nodes under its `dependencies` tree) and
re-run `npm install`, then confirm with:

```sh
npm ls <package>
```

The lockfile was `lockfileVersion` 2 for a long time, and `npm install`
preserves whatever version is already on disk - don't let a tool rewrite it as
an incidental part of an unrelated change. It moved to `lockfileVersion` 3
deliberately while fixing the `uuid`/`@sentry/node` advisories below: several
packages had stale nested copies that an override or a version bump could not
reach without a full `rm -rf node_modules package-lock.json && npm install`,
and that full re-resolution is what npm 11 writes as v3. If you need to touch
overrides again and want to stay on v2, do the surgical
`npm ls <package>` / hand-edit approach described above first; only reach for
a full clean reinstall (and accept the v3 bump) when that fails, and call it
out rather than letting it happen silently.

### uuid, @sentry/node, @sentry/browser: fixed by upgrading and patching

These three (plus the `cookie` and `https-proxy-agent` advisories that were
only reachable through the old `@sentry/node`) are fixed as of this writing.
None of them turned out to be blocked - they just needed more than
`npm audit fix`:

- `uuid` moved from the v3 default-export API (`require('uuid/v4')`) to the
  named-export API (`const { v4 } = require('uuid')`) at v7, so the four call
  sites in `packages/junon-io/{server,client/src}` needed a source change, not
  just a version bump. A root `overrides` entry pins the resolved version to
  `^11.1.1` everywhere, including inside `sequelize`, `aws-sdk`, and `gaxios`,
  none of which needed code changes since they already used the named-export
  API internally.
- uuid's browser build (`dist/cjs-browser/{v1,v6,v7}.js`) uses the `??=`
  operator, which the acorn version bundled with this project's browserify
  can't parse - `require('uuid')` pulls in the whole barrel (v1 through v7)
  even though only `v4` is used, so the client build fails before it gets to
  bundle anything. Rather than hand-patch uuid's installed files, the gulp
  client build now runs a scoped `babelify` transform
  (`legacySyntaxTransform` in `packages/junon-io/gulpfile.js`) over
  `productionBrowserify`, `developmentBrowserify`, and `vendor` - `only:
  [/node_modules\/uuid\//]` limits it to uuid, with
  `@babel/plugin-transform-logical-assignment-operators` and
  `@babel/plugin-transform-nullish-coalescing-operator` transpiling `??=`/`??`
  down to old-parser-safe code. Nothing else in the vendor bundle is touched -
  see the "why not firebase 9+" section below for why a *global* transform
  (needed for firebase, not for this) is a much bigger, riskier change than
  this narrow one. `global: true` has to go on the `.transform()` call itself,
  not inside `babelify.configure()`'s options - browserify's own transform
  flag and babel's option object share the object shape, but babel rejects an
  unrecognized `global` key. If a future dependency hits the same
  can't-parse-this-syntax error, add its path to `only` and, if the syntax
  isn't nullish-coalescing/logical-assignment, add the matching
  `@babel/plugin-transform-*` to `plugins`.
- `@sentry/node` and `@sentry/browser` moved 5.x/4.x -> 10.x across
  `junon-common`, `junon-io`, and `junon-matchmaker` (which declared
  `@sentry/node` but never required it directly - the dependency was dead
  weight and was removed instead of upgraded). The integration API changed
  completely: `Sentry.configureScope(cb)` is gone
  (`server.js`, `entities/game.js` now call `Sentry.getCurrentScope()`
  directly), and the class-based `Integration#setupOnce(addGlobalEventProcessor,
  getCurrentHub)` shape is gone in favor of `Integration#processEvent(event)`.
  `better_dedupe.js` (both the server copy in `junon-common` and the client
  copy in `junon-io/client/src/util`) was rewritten to the new shape; the
  dedup logic itself (fingerprint/stacktrace hashing to avoid re-reporting and
  the CPU cost of re-parsing stacks) is unchanged.
- Sentry's v10 packages ship dual CJS/ESM with a `require` condition that
  resolves to CommonJS, so - unlike firebase below - there was no browserify
  ESM blocker here.

### Vulnerabilities with no available fix right now

`npm audit` is not clean, and won't be from a dependency bump alone. Every
remaining advisory falls into one of three groups, none of which npm can
resolve on its own:

**Held for the browserify build (see firebase below for the general shape of
this problem):**

- `@firebase/app`, `@firebase/component`, `@firebase/database`,
  `@firebase/util` - see "firebase: scoped packages, held on the 7-era line".

**No upstream fix exists at all**, not even one that would require a breaking
change - `npm audit fix` and `npm audit fix --force` both no-op on these
because there is nothing newer to move to:

- `elliptic` is already at its latest published version (`6.6.1`); the
  advisory (GHSA-848j-6mx2-7j84, a risky cryptographic primitive) has no
  patched release yet. `browserify-sign` and `create-ecdh` pull it in, and
  `crypto-browserify` pulls in both - this whole chain is `browserify`'s
  Node-crypto polyfill for the client bundle, not code this project calls
  directly.

**The only fix is ESM-only, which breaks the CommonJS consumer that needs
it** - functionally the same blocker as firebase's `browser` field, but at the
`require()` level instead of the bundler level:

- `decode-uri-component` is vulnerable at `<=0.4.2`; the fix is `0.5.0`, but
  `0.5.0` ships `"type": "module"` with no CommonJS entry point.
  `source-map-resolve` (which `gulp-sourcemaps` depends on through `css`)
  loads it with a plain `require("decode-uri-component")`, which would throw
  `ERR_REQUIRE_ESM` against `0.5.0`. `source-map-resolve`'s latest version
  (`0.6.0`) still declares `decode-uri-component: ^0.2.0`, so there is no
  version of the chain that is both patched and requireable. `css` is
  additionally capped at `2.X` by `gulp-sourcemaps@2.6.5`'s own
  `package.json`, so even ignoring the ESM problem, `css@3.0.0` (which moved
  to `source-map-resolve@0.6.0`) can never be selected here. This whole chain
  only runs at build time, generating source maps for the gulp pipeline - it
  is not bundled into the shipped client.

### aws-sdk v2: deferred, needs a v3 migration

`aws-sdk` (the v2 SDK) carries a low-severity advisory
(GHSA-j965-2qgj-vjmq, missing region-parameter validation).
`npm audit fix --force` reports a fix by *downgrading* to `aws-sdk@1.18.0`,
which is not a real fix - v2 has no patched release, since AWS considers v2
end-of-support and ships no more updates to it at all. The only real fix is
migrating to `@aws-sdk/client-s3` (SDK v3).

This is deliberately deferred rather than attempted alongside the other
advisories in this file, because it is not a version bump - it is a rewrite of
every direct `aws-sdk` call site, and those call sites are the game's save/load
path:

- `packages/junon-io/server/util/s3_client.js`
- `packages/junon-io/server/entities/game.js` (`putObject`/`deleteObject` for
  sector saves)
- `packages/junon-common/world_serializer.js` (`listObjects`/`getObject`/
  `deleteObject`/`putObject` for sector saves)
- `packages/junon-io/server/util/tasks/copy_s3_saves_to_all.js` (maintenance
  script, talks to a DigitalOcean Spaces endpoint, not AWS)
- `packages/junon-io-watchdog/index.js`

The risky part isn't the client construction or the command objects - it's
that SDK v3's `getObject` returns `Body` as a stream, not a Buffer, and every
one of the call sites above (plus their callers) currently treats
`data.Body` as a Buffer. `client.send(command, callback)` is supported in v3
for a callback-shaped migration, but the stream-vs-Buffer change still needs
to be handled explicitly (e.g. buffering `Body` before invoking the existing
callback contract) and verified against real save/load, not just unit tests -
`packages/junon-io/test` does not exercise real S3.

### firebase: scoped packages, held on the 7-era line

The client does not depend on the `firebase` umbrella. It depends on the three
scoped packages it actually uses, pinned to the versions `firebase@7.24.0`
resolved:

```
"@firebase/app": "0.6.11"
"@firebase/auth": "0.15.0"
"@firebase/database": "0.6.13"
```

`client/src/vendor.js` requires those directly. The umbrella's `firebase/app`
was only `@firebase/app` plus a `registerVersion("firebase", "7.24.0", "app")`
call, and vendor.js keeps that call so the SDK still reports the same version
string. `firebase.SDK_VERSION` is unaffected either way - it is baked into
`@firebase/app` (7.20.0), not set by the umbrella.

The umbrella pulled analytics, firestore, functions, installations, messaging,
performance, remote-config and storage into the tree for code the bundle never
loaded. firestore and functions were the last two high advisories in the
repository, both through an old `node-fetch`. Dropping the umbrella removed
them along with six moderates. The shipped bundle barely changed - 314 bytes -
which is the direct evidence that none of it was ever bundled.

Verify a change here against the built artifact, not just the build exit code.
Firebase is off in `development` and `test` (`server.js` sets `global.isOffline`
unless `JUNON_USE_FIREBASE=true`), so neither Jest nor the e2e suite exercises
sign-in; a broken namespace would still let every suite pass. Load the built
vendor bundle in a browser and confirm `window.firebase` still carries
`initializeApp`, `apps`, `auth()`, `database()` and
`auth.GoogleAuthProvider` / `auth.FacebookAuthProvider` - the surface
`client/src/util/firebase_client_helper.js` uses.

#### Why not firebase 9+

Moving to a current major is blocked by the client build, not by the API.
firebase 9 removed the namespaced API but `firebase/compat/*` restores it
exactly, so the source change is small. The problem is resolution: every
`firebase/compat/*` and `@firebase/*-compat` package declares `main` as
CommonJS but `browser` as ESM, browserify prefers `browser`, and browserify
cannot parse ESM - the bundle fails with `'import' and 'export' may appear only
with 'sourceType: module'`. Three routes were tried and none is contained:

| Attempt | Result |
| --- | --- |
| `require("firebase/compat/app")` | resolves to `dist/esm/index.esm.js`, parse error |
| the prebuilt UMD bundles (`firebase/firebase-app-compat.js`) | re-enters the same chain via `require('@firebase/app-compat')` |
| a custom `resolve` for firebase ids in the browserify options | browserify applies the `browser` field independently of `resolve`; app, auth and database all still fail |

Clearing it needs an ESM-to-CommonJS transform (`esmify`, or `babelify` with
`@babel/preset-env`) applied with `global: true` to the vendor bundle, which
changes how every other vendor package is processed - pixi.js, @sentry/browser,
protobufjs, howler, @fingerprintjs/fingerprintjs. That is a build-pipeline
change rather than a dependency bump.

What staying on this line still carries is moderate, not high: `@firebase/util`
and the packages that depend on it (`@firebase/app`, `@firebase/component`,
`@firebase/database`) carry an uncontrolled-resource-consumption advisory, and
GHSA-3wf4-68gx-mph8 (`_authTokenSyncURL`, moderate, `<10.9.0`) applies to the
range. `@firebase/auth` itself carries no advisory.

### protobufjs is pinned below 8.2.0

`protobufjs` must stay on `^7.6.6`. The wire protocol sends partial updates -
a message names only the fields that changed - and both sides decide what to
apply with `data.hasOwnProperty(field)`, in roughly 90 places
(`Player#updateInput`, `RemoteEventHandler`, `BaseBuilding#applyData`, the
client's `syncWithServer` paths).

proto3 gives plain scalars implicit presence, so a field set to `0`, `false` or
`""` is indistinguishable on the wire from an absent one. protobufjs
historically serialised any own property regardless of value, which is what
makes those presence checks work. From 8.2.0 it implements proto3 presence
properly, and every one of those checks silently takes the "field absent"
branch for a value that changed *to* zero. Observed boundaries against this
repository's schema:

| Version | Behaviour |
| --- | --- |
| `<= 8.0.3` | `{controlKeys: 0}` encodes to `08 00`, decodes with an own property |
| `8.2.0` - `8.6.5` | still encoded, but decode no longer sets an own property |
| `>= 8.6.6` | the field is not encoded at all |

`8.0.0` - `8.6.5` also carries a high-severity advisory, so `^7.6.6` is the only
range that is both patched and compatible.

`test/protocol/field_presence.test.js` pins this. If it fails after a dependency
change, protobufjs moved - before it can land, every presence-checked field
needs explicit `optional` presence in `packages/junon-common/protocol/*.proto`,
which is a protocol change affecting client and server together.

## Run modes

```sh
# Watch and serve the browser client
npm run client

# Watch the authoritative game server
npm run serveronly

# Start the matchmaker
npm run matchmaker

# Watch the combined game server + matchmaker entry point
npm run server

# Create a production-oriented client bundle
npm run client:build
```

The root `server` script uses Nodemon with `start_server.js`. The game server's
development HTTP port defaults to 8000 in code; the historical README mentions
8001, so confirm the URL printed by the running processes rather than relying on
the old value.

## Standalone (offline) mode

`NODE_ENV=standalone` runs one world per game-server process with no matchmaker,
MySQL, Firebase, S3 or Sentry. It is the runtime for the offline desktop build
and co-op listen servers (see
[the execution plan](exec-plans/active/electron-offline-coop.md)). Gameplay uses
production settings: `debugMode` is off, unlike `development`, where waves,
build speed and admin mode differ.

| Variable | Meaning |
| --- | --- |
| `JUNON_SAVES_DIR` | Required. Worlds are stored as `<dir>/<worldId>/sector.sav`, the same bytes as the hosted S3 objects. |
| `JUNON_WORLD_ID` | Optional. The world to load at startup, or to generate if it has no save yet. `[A-Za-z0-9_-]` only. Without it, the local menu selects the first world. |
| `JUNON_OWNER_UID` | Required when `JUNON_WORLD_ID` is set. Local profile id of the world's owner. |
| `JUNON_WORLD_NAME`, `JUNON_GAME_MODE` | New worlds only; an existing save supplies its own name and mode. Mode defaults to `survival`. |
| `PORT` | Game socket port (default 8000). |
| `JUNON_HOST` | Address the game socket binds to. Defaults to `127.0.0.1`, so nothing on the network can connect. Co-op hosting from the menu doesn't need it (see below). |
| `JUNON_CLIENT_PORT` | Port of the page server for the browser client (default 8001, always on `127.0.0.1`). |

```sh
# terminal 1: build and watch the standalone browser client
NODE_ENV=standalone npm run client

# terminal 2: open the local world menu
NODE_ENV=standalone JUNON_SAVES_DIR=/tmp/junon-saves \
  node packages/junon-io/server/server.js
```

Then open `http://localhost:8001/`. The menu creates, lists, loads, and imports
worlds, and joins a co-op host by address and port. It talks to loopback-only
`/local/*` routes on the page server; that server owns the SQLite registry and
save directory. The optional `?server=ws://127.0.0.1:8000&name=YourName`
direct-connect entry remains for tests and development.
Its identity is the local profile in `localStorage` (`junon_local_profile`),
whose `uid` is what `JUNON_OWNER_UID` must match when preloading a world.

### Co-op

**Host co-op** in the menu opens one of your worlds to other players on a port
you choose (default 7777), with an optional password, and joins it. The server
keeps your own socket on loopback and adds a guest listener on all interfaces.
The Host panel and an in-game chat line list the machine's IPv4 addresses.
Friends use **Join co-op** with `address:port`. Their client first asks the
host's `GET /info` for its protocol hash and whether the password is right, so
a different game version or a wrong password gets a clear message. The socket
URL then carries `?protocol=<hash>&password=<password>`, and the server refuses
upgrades without them.

- Guests are identified by their own local profile. Their characters, and their
  ATM balance, are stored in the host's world and SQLite file. A guest can't
  join with the owner's profile id.
- Hosting stops when the host clicks Stop hosting, opens another world, or
  quits. Guests are disconnected with a message saying why. Their characters are
  saved with the world.
- On the internet, the host forwards the TCP port on their router or uses an
  overlay VPN such as Tailscale or ZeroTier. On Windows and macOS the first
  hosting session triggers the OS firewall prompt for the game server process.
- To try it on one machine, run two desktop instances with different
  `JUNON_USER_DATA_DIR` values, or join from a browser on the standalone page
  server.

To play a world exported from the hosted game, import it. Import replaces
the hosted account ids, makes your profile the owner of the world and of its
main colony team, and lets you take over one of its characters:

```sh
# list the save's characters (filter with --search)
node packages/junon-io/server/util/tasks/import_save.js sector.sav \
  --saves-dir /tmp/junon-saves --owner <your profile id> --search kur

# import, playing as one of them (or --new for a new character)
node packages/junon-io/server/util/tasks/import_save.js sector.sav \
  --saves-dir /tmp/junon-saves --owner <your profile id> --owner-name YourName \
  --character kuroro
```

It prints the new world id to start the server with. In the world, the owner
can switch to any other unclaimed character with `/character list [search]`,
`/character <name>`, or `/character new`. The character you leave becomes
unclaimed. Saved characters keep their own names. Hosted PvP and minigame
saves are rejected.

The server autosaves every three minutes and saves on `SIGINT`/`SIGTERM`. In
this mode an unhandled promise rejection is logged instead of crashing the
world.

A world stands still, clock included, while nobody is playing it: no player is
connected, or the only one is the host with the in-game menu open or the window
hidden (the client sends `SetPaused`). Co-op guests keep it running.

Standalone uses a SQLite file, `<JUNON_SAVES_DIR>/junon.sqlite`, in place of
MySQL. It has the same models and tables, and is shared by every world in that
saves directory:
- **`sectors`** is the world registry (name, game mode, owner). A world without
  a row is registered on first start from its save header, or from
  `JUNON_WORLD_NAME`/`JUNON_GAME_MODE` if it has no save yet.
- **`users`** has one row per local profile, created when that profile first
  joins. It backs account features such as the ATM balance, which is
  therefore per profile and shared across worlds, like the hosted account.
  Balances from the hosted game can't be imported, because they were only ever
  in MySQL.

The schema comes from the models (`junon-common/db/standalone_schema.js`), not
from `db/migrations`, which are MySQL-only. Missing tables and newly added
columns are created at startup. Renaming or removing a column needs an explicit
standalone step.

### Desktop app

`packages/junon-desktop` is the Electron shell for the same runtime. It loads
the production client build, so build that for standalone first and rebuild it
after client changes:

```sh
NODE_ENV=standalone npm run client:build
npm run desktop
```

The window loads `app://junon/` from `packages/junon-io/dist/`, and the app
refuses to start if that build is missing or wasn't built for standalone. The
game server runs in an Electron utility process on a free loopback port. The
saves directory is `<userData>/saves`, for example
`~/.config/junon-desktop/saves` on Linux. The local menu reaches the server over
IPC (`window.junonDesktop`), not over HTTP, so no page server runs. Quitting the
app saves the open world. The local profile stays in the window's
`localStorage`, which is tied to the fixed `app://junon` origin.

Set `JUNON_USER_DATA_DIR` to run with a different user-data directory, for
example to run two instances side by side. Server output appears in the
terminal that ran `npm run desktop`.

## Configuration and integrations

Runtime behavior depends on `NODE_ENV` and, depending on the service, variables
such as `PORT`, `MATCHMAKER_PORT`, `REGION`, `NODE_NAME`, `IP_ADDRESS`, and
`S3_BUCKET_NAME`. Sentry, Firebase, AWS, and production scaling require additional
environment-specific credentials or metadata.

The game server and matchmaker automatically load a root `.env` file before
initializing configuration, including when their workspace scripts are run
directly. Keep this file uncommitted. `direnv` remains useful when local setup
requires `.envrc` shell logic beyond environment variables stored in `.env`.

Firebase is disabled by default in `development` and `test`, so local startup
does not need Google Application Default Credentials. To intentionally exercise
Firebase in a credentialed local environment, set `JUNON_USE_FIREBASE=true` in
your uncommitted `.env` file. Do not use that flag with placeholder credentials.

Do not invent placeholder production credentials to make local startup pass.
Prefer focused tests for isolated code and report unavailable integrations.

## Generated output

The Gulp pipeline writes development output under
`packages/junon-io/client/dist/` and production output under
`packages/junon-io/dist/`. Do not hand-edit or review generated bundles as source.

Protocol files from `junon-common` are copied with a content-derived hash during
the client build. When changing a protocol, rebuild the client and verify all
producers and consumers.
