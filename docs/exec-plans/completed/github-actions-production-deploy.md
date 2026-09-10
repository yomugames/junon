# Outcome

Deploy the current production client and server update process automatically
when `master` is pushed, without storing deployment credentials in the
repository.

## Context

The local deployment commands built the `junon-io` client with production
settings, published maps to Sentry, rsynced `packages/junon-io/dist/` to the web
host, and ran `git pull origin master && npm ci` in the server checkout. This
plan records the GitHub Actions replacement. See [production deployment](../../deployment.md).

## Progress

- [x] 2026-09-10: Identified the existing client and server deployment commands.
- [x] 2026-09-10: Added a serialized, master-triggered production workflow.
- [x] 2026-09-10: Documented required secrets, behavior, and rollback.
- [x] 2026-09-10: Added a post-deployment Firebase node-revision update to
  start the existing graceful rollout.

## Implementation

1. Run on pushes to `master` and allow manual workflow dispatch.
2. Install repository dependencies, build the client, create/finalize the Sentry
   release, and upload source maps.
3. Rsync the client distribution excluding maps, then run the established server
   update command over SSH.
4. Set the deployed node's Firebase revision so the matchmaker can gracefully
   drain old-revision workers.
5. Keep deployment identities, Firebase credentials, and verified host keys in
   the `production` environment secrets.

## Validation

- Parse the workflow YAML.
- Review the rendered workflow commands against the supplied deployment scripts.
- A live deployment requires production environment secrets and hosts, which are
  intentionally unavailable in this checkout.

## Decisions

- 2026-09-10: Use a single workflow/job so server updates occur only after a
  successful client build and upload.
- 2026-09-10: Exclude `*.map` from rsync because maps are uploaded to Sentry and
  should not be publicly served.
- 2026-09-10: Retain the supplied server command without adding a restart; the
  process manager and restart semantics are not represented in the repository.
- 2026-09-10: Use a Firebase Admin service-account secret in GitHub Actions to
  update the per-node revision only after the server deployment succeeds.

## Discoveries and risks

The supplied server command does not restart the running application. A code
update may therefore require an existing watcher or a future documented restart
step before it takes effect. The server checkout also needs its own existing
non-interactive access to `origin`.

## Result

The workflow builds and deploys the client, updates the server checkout, and
then updates the configured Firebase node revision to start the existing
graceful sector-drain behavior. Live validation is pending configuration of the
documented GitHub environment secrets.
