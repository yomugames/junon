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

The lockfile is `lockfileVersion` 2. `npm install` preserves that; do not let a
tool rewrite it to 3 as an incidental part of an unrelated change.

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
