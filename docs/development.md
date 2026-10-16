# Development

## Prerequisites

- Node.js 26.4.0 (declared by the root `.nvmrc`)
- npm with workspace support
- system libraries required by native npm dependencies such as `sharp` and
  `sqlite3` (both normally install prebuilt binaries)

The workspace `.nvmrc` files match the root Node.js version, so workspace and
root commands use the same runtime.

## Install

From the repository root:

```sh
npm install
```

There is no database to set up: the game server creates its SQLite file in the
saves directory on start (see [Running the game](#running-the-game)).

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
  `^11.1.1` everywhere, including inside `sequelize`, which needed no code
  change since it already used the named-export API internally.
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
  down to old-parser-safe code. Nothing else in the vendor bundle is touched;
  a *global* transform (which an ESM-only dependency would need) is a much
  bigger, riskier change than this narrow one. `global: true` has to go on the `.transform()` call itself,
  not inside `babelify.configure()`'s options - browserify's own transform
  flag and babel's option object share the object shape, but babel rejects an
  unrecognized `global` key. If a future dependency hits the same
  can't-parse-this-syntax error, add its path to `only` and, if the syntax
  isn't nullish-coalescing/logical-assignment, add the matching
  `@babel/plugin-transform-*` to `plugins`.
- `@sentry/node` and `@sentry/browser` moved 5.x/4.x -> 10.x. The integration
  API changed completely: `Sentry.configureScope(cb)` is gone (`entities/game.js`
  now calls `Sentry.getCurrentScope()` directly), and the class-based
  `Integration#setupOnce(addGlobalEventProcessor, getCurrentHub)` shape is gone
  in favor of `Integration#processEvent(event)`. `junon-common/better_dedupe.js`
  was rewritten to the new shape; the dedup logic itself (fingerprint/stacktrace
  hashing to avoid re-reporting and the CPU cost of re-parsing stacks) is
  unchanged.
- Sentry's v10 packages ship dual CJS/ESM with a `require` condition that
  resolves to CommonJS, so there was no browserify ESM blocker here.

### Vulnerabilities with no available fix right now

`npm audit` is not clean, and won't be from a dependency bump alone. Every
remaining advisory falls into one of two groups, neither of which npm can
resolve on its own:

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
it** (browserify, and plain `require()`, can't load ESM-only packages):

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

## Running the game

The game server hosts one world per process and needs no network service (see
[ARCHITECTURE.md](../ARCHITECTURE.md)). `NODE_ENV` selects gameplay settings:
`standalone` plays like the released game, while `development` (the default)
and `test` turn on `debugMode`: waves every 5 s, faster building and firing,
admin mode for every player, and the `app_debug.proto` wire format.

```sh
# terminal 1: build and watch the browser client
npm run client

# terminal 2: run the game server (development), restarting on changes
npm run server
```

Then open `http://localhost:8001/`. Both use `development` unless `NODE_ENV` is
set; build and run with `NODE_ENV=standalone` to play with release gameplay.
`npm run client:build` creates the production client bundle in
`packages/junon-io/dist/`, which the desktop app loads.

| Variable | Meaning |
| --- | --- |
| `JUNON_SAVES_DIR` | Worlds are stored as `<dir>/<worldId>/sector.sav`, the same bytes as the hosted game's S3 objects, next to the SQLite file. Required, except in `development`, where it defaults to the repository's gitignored `.dev-saves/`. |
| `JUNON_WORLD_ID` | Optional. The world to load at startup, or to generate if it has no save yet. `[A-Za-z0-9_-]` only. Without it, the local menu selects the first world. |
| `JUNON_OWNER_UID` | Required when `JUNON_WORLD_ID` is set. Local profile id of the world's owner. |
| `JUNON_WORLD_NAME`, `JUNON_GAME_MODE` | New worlds only; an existing save supplies its own name and mode. Mode defaults to `survival`. |
| `PORT` | Game socket port (default 8000). |
| `JUNON_HOST` | Address the game socket binds to. Defaults to `127.0.0.1`, so nothing on the network can connect. Co-op hosting from the menu doesn't need it (see below). |
| `JUNON_CLIENT_PORT` | Port of the page server for the browser client (default 8001, always on `127.0.0.1`). |

The menu creates, lists, loads, and imports worlds, and hosts or joins co-op. It talks to loopback-only
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
host's `GET /info` for its protocol hash and checks the password, so a
different game version or a wrong password gets a clear message. The socket
URL then carries `?protocol=<hash>&challenge=<challenge>&proof=<proof>`, and the
server refuses upgrades without them.

The password itself never leaves the guest's machine. Each `/info` response
holds a random single-use challenge (valid for a minute), and the guest answers
with HMAC-SHA256 of it keyed by SHA-256 of the password
(`client/src/util/coop_auth.js`, `Server#isGuestProofValid`). The host keeps
only that hash. A captured URL can't be replayed, and after 10 wrong answers
from one address in a minute, that address is refused until the minute is up.
Each connection attempt, reconnects included, fetches a new challenge. The
game traffic itself is not encrypted (`ws://`), and someone who records a
guest's join could still try to guess a weak password offline, so use a strong
one when the port is open to the internet.

- Guests are identified by their own local profile. Their characters, and their
  ATM balance, are stored in the host's world and SQLite file. A guest can't
  join with the owner's profile id.
- World thumbnails (the team menu's Preview) are served by the game server at
  `/screenshots/<id>_thumb.jpg`, only for the open world, so guests load them
  from the host.
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

The server autosaves every three minutes (except in `development`/`test`) and
saves on `SIGINT`/`SIGTERM`. An unhandled promise rejection is logged instead of
crashing the world.

A world stands still, clock included, while nobody is playing it: no player is
connected, or the only one is the host with the in-game menu open or the window
hidden (the client sends `SetPaused`). Co-op guests keep it running.

The database is a SQLite file, `<JUNON_SAVES_DIR>/junon.sqlite` (in memory under
`test`), with the models and tables the hosted game had in MySQL. It is shared
by every world in that saves directory:
- **`sectors`** is the world registry (name, game mode, owner). A world without
  a row is registered on first start from its save header, or from
  `JUNON_WORLD_NAME`/`JUNON_GAME_MODE` if it has no save yet.
- **`users`** has one row per local profile, created when that profile first
  joins. It backs account features such as the ATM balance, which is
  therefore per profile and shared across worlds, like the hosted account.
  Balances from the hosted game can't be imported, because they were only ever
  in MySQL.

The schema comes from the models (`junon-common/db/standalone_schema.js`); there
are no migrations. Missing tables and newly added columns are created at
startup. Renaming or removing a column needs an explicit step there, since
players' existing files must keep working. Tables of removed hosted features
(favorites, votes, friends, sessions) may remain in older files, unused.

### Desktop app

`packages/junon-desktop` is the Electron shell for the same server. It loads
the production client build for standalone, which `npm run desktop` builds
before every launch (`cross-env NODE_ENV=standalone npm run client:build`,
about half a minute). To launch without rebuilding, when only server or desktop
code changed (both run from source):

```sh
npm run desktop
npm run start --workspace packages/junon-desktop   # no client build
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

#### Packaging

`npm run desktop:package` builds the standalone client and packages the app
with electron-builder (`packages/junon-desktop/electron-builder.config.js`)
into a plain folder under `packages/junon-desktop/release/`, which is what
itch.io's `butler push` uploads. It builds for the current platform; pass a
platform to build another:

```sh
npm run desktop:package                # this platform
npm run desktop:package -- --win       # release/win-unpacked/Junon.exe
npm run desktop:package -- --linux     # release/linux-unpacked/junon-desktop
```

Packaging needs network access: it downloads Electron for the target and the
target's native binaries. electron-builder's native rebuild is off, because it
overwrites the workspace's `node_modules` with the target platform's binaries.
Instead `scripts/after_pack.js` puts them in the packaged copy only: the N-API
prebuilt `sqlite3` binary (prebuild-install) and sharp's `@img/sharp-<platform>-<arch>`
package (`npm pack`). That is what lets a Windows build be made on Linux. The
app isn't put in an asar archive, because the game server runs from
`junon-io`'s directory and the native modules are replaced after packing.

A packaged build leaves out the Steam binding (`steamworks-ffi-node`, `koffi`)
and `junon-io`'s client sources, tests and build tooling. Code that the game
server loads therefore can't require anything under `packages/junon-io/client/`.
The Windows exe and the Linux window use `packages/junon-desktop/assets/icon.png` (512×512 with transparency) as their icon. A Windows exe built on Linux isn't code-signed.

On Windows, extract the whole release folder onto a local drive before launching
`Junon.exe`. In Parallels, macOS shared folders such as `\\Mac\Home\Downloads`
are network shares from the Windows guest. Electron can fail to launch its
sandboxed GPU process from a share (`GPU process launch failed: error_code=18`,
then `GPU process isn't usable`), even when the executable itself starts. Copy
the extracted folder to a path such as `C:\Games\Junon` and run the exe there;
keep its `resources` and other packaged files beside it. A PowerShell prompt's
current directory does not change where an exe launched by its full path runs.

Check a packaged build with `test/packaged.spec.js` ([testing.md](testing.md#desktop-e2e)).

### Steam

Steam co-op is being built ([execution plan](exec-plans/active/steam-coop.md)).
With Steam, **Host co-op** can host on Steam: the host opens a Steam lobby
(friends only, or invite only), and friends join from an invite, from Join
Game in the Steam friends list, or from the friends listed in **Join co-op**.
Steam co-op is off by default while builds ship on itch.io only; start the
desktop app with `JUNON_STEAM=1` to turn it on. No port forwarding is needed:
game traffic goes peer to peer over Steam's relay, to the lobby's owner, who
only accepts lobby members. With Steam on, the desktop app's main process
loads Steamworks through `steamworks-ffi-node`
(`packages/junon-desktop/src/steam.js`) and, if anything is missing, logs one
`Steam: ...` line and runs without Steam. It needs:

- the Steam client running and logged in;
- the Steamworks SDK redistributables, which Valve's license keeps out of the
  repository. Download the SDK from the Steamworks partner site and either
  copy its `redistributable_bin/` to `steamworks_sdk/redistributable_bin/` at
  the repository root (gitignored) or set `JUNON_STEAMWORKS_SDK` to the SDK's
  `sdk/` directory.

| Variable | Meaning |
| --- | --- |
| `JUNON_STEAM` | `1` turns Steam on. Steam is off by default while builds ship on itch.io only. |
| `JUNON_STEAM_APP_ID` | Steam app id. Defaults to 480 (Valve's "Spacewar" test app) until Junon has its own. Any Steam account can use 480. |
| `JUNON_STEAMWORKS_SDK` | Path to an unpacked Steamworks SDK's `sdk/` directory. |
| `JUNON_STEAM_FAKE_SDK`, `JUNON_FAKE_STEAM` | Tests only: load the in-memory Steam in `packages/junon-desktop/test/support/fake_steam.js` instead of the binding, with a scenario as JSON. Never set them otherwise. |

Testing Steam co-op by hand takes two Steam accounts that are friends, on two
machines; one account can't be both host and guest. With app id 480 both
accounts can run it. Invites and Join Game only reach a running copy through
Steam, so start the desktop app with Steam running. Steam guests are
characters keyed by their local profile for now; keying them by Steam account
is the next step of the plan.

### Online co-op (WebRTC)

Online co-op is being built ([execution plan](exec-plans/active/webrtc-coop.md))
for builds without Steam, such as itch.io. **Host co-op** gets **Host online
and play**, which shows a room code; friends enter it under **Join co-op**.
Game traffic goes peer to peer over WebRTC; the signalling server in
`packages/junon-signal` only pairs the two. The desktop app shows these
controls only when it knows a signalling server:

| Variable | Meaning |
| --- | --- |
| `JUNON_SIGNAL_URL` | Desktop app: the signalling server, `ws://` or `wss://`, in place of `DEFAULT_SIGNAL_URL` in `packages/junon-desktop/src/main.js` (the deployed Cloudflare Worker). `off` turns online co-op off; the desktop tests set it. |

To try it on one machine, run the signalling server, then two desktop
instances with separate user-data directories:

```sh
npm run signal
JUNON_SIGNAL_URL=ws://127.0.0.1:8787 npm run desktop
JUNON_SIGNAL_URL=ws://127.0.0.1:8787 JUNON_USER_DATA_DIR=/tmp/junon-guest npm run desktop
```

The signalling protocol has two implementations in `packages/junon-signal`,
tested against the same suite: a Cloudflare Worker (`worker/index.mjs`), the
production target, and a plain Node server (`src/signal_server.js`), for
development, tests and self-hosting. `npm run dev:worker --workspace
packages/junon-signal` runs the Worker locally on `ws://127.0.0.1:8787` too.

#### Cloudflare Worker

The Worker routes each connection to a Durable Object per room (`Room`),
named by the room code, and keeps per-address limits in another
(`AddressLimits`); `wrangler.toml` declares both. Rooms use the WebSocket
Hibernation API: between joins they're evicted from memory, the host's
keepalive pings are answered without waking them, and deadlines (guest
lifetime, the host's resume window) are one alarm. Billed time is a few
seconds per join, not the length of a hosting session. Deploy:

```sh
cd packages/junon-signal
npx wrangler login
npx wrangler deploy
# optional TURN: the shared secret, plus TURN_URLS under [vars]
npx wrangler secret put TURN_SECRET
```

`DEFAULT_SIGNAL_URL` is the deployed Worker's `wss://` address (a
`workers.dev` one; a custom domain can replace it). Settings are `[vars]` in
`wrangler.toml`, documented at the top of `worker/index.mjs`: `ICE_SERVERS`,
`TURN_URLS`, `TURN_SECRET`, `TURN_TTL`, and limits for tests. Unlike the Node
server, it limits rooms opened per address per 10 minutes (10), not rooms
open at once, and has no per-address connection cap; Cloudflare's own
protection covers floods.

#### Node server

A plain Node process (`npm run signal`, or
`node packages/junon-signal/src/index.js`) with no database. Deploy it behind
a TLS-terminating reverse proxy that forwards WebSocket upgrades, so release
builds use `wss://`, and set `JUNON_SIGNAL_TRUST_PROXY=1` there so its
per-address limits see players' addresses. `GET /health` answers `ok` (on
the Worker too).

| Variable | Meaning |
| --- | --- |
| `JUNON_SIGNAL_PORT`, `JUNON_SIGNAL_HOST` | Where to listen. Default `0.0.0.0:8787`. |
| `JUNON_SIGNAL_TRUST_PROXY` | `1` behind a reverse proxy: take the client's address from the last `X-Forwarded-For` entry. |
| `JUNON_SIGNAL_ICE_SERVERS` | JSON array of `RTCIceServer`s handed to both peers, replacing the default public STUN servers (Google, Cloudflare). |
| `JUNON_SIGNAL_TURN_URLS`, `JUNON_SIGNAL_TURN_SECRET`, `JUNON_SIGNAL_TURN_TTL` | Optional TURN relay: comma-separated `turn:` URLs and the TURN server's shared secret (coturn `use-auth-secret`). Each peer gets credentials valid for `TTL` seconds (default 3600). Off by default. |

Without TURN, players whose networks block direct connections can't connect
and are told to join by address or over a VPN. Changing the signalling
protocol affects every released game; see
[ARCHITECTURE.md](../ARCHITECTURE.md#important-contracts).

## Configuration

The game server loads a root `.env` file before initializing configuration,
including when its workspace scripts are run directly. Keep this file
uncommitted. `direnv` remains useful when local setup requires `.envrc` shell
logic beyond environment variables stored in `.env`.

`JUNON_SERVER_SENTRY_DSN` turns on Sentry error reporting outside
`development`/`test`; without it errors are only logged. Never commit a DSN.

## Generated output

The Gulp pipeline writes development output under
`packages/junon-io/client/dist/` and production output under
`packages/junon-io/dist/`. Do not hand-edit or review generated bundles as source.

Protocol files from `junon-common` are copied with a content-derived hash during
the client build. When changing a protocol, rebuild the client and verify all
producers and consumers.
