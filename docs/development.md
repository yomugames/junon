# Development

## Prerequisites

- Node.js 20.9.0 (declared by the root `.nvmrc`)
- npm with workspace support
- MySQL for database-backed paths
- system libraries required by native npm dependencies such as `sharp` and
  `uWebSockets.js`

The `junon-io` and `junon-matchmaker` workspace `.nvmrc` files still declare
Node.js 16.15.0. Treat them as legacy compatibility signals; use the root version
for root workspace commands unless a package-specific regression requires Node 16.

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

Do not invent placeholder production credentials to make local startup pass.
Prefer focused tests for isolated code and report unavailable integrations.

## Generated output

The Gulp pipeline writes development output under
`packages/junon-io/client/dist/` and production output under
`packages/junon-io/dist/`. Do not hand-edit or review generated bundles as source.

Protocol files from `junon-common` are copied with a content-derived hash during
the client build. When changing a protocol, rebuild the client and verify all
producers and consumers.
