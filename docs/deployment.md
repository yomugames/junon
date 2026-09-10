# Production deployment

Pushing to `master` runs [Deploy production](../.github/workflows/deploy-production.yml).
The workflow builds the browser client, uploads its source maps to Sentry, syncs
the client bundle to the web host, then updates the production server checkout
and runs `npm ci`.

## Required GitHub configuration

Create a `production` environment in the repository and add these environment
secrets:

- `DEPLOY_SSH_PRIVATE_KEY`: private key authorized as `root` on both deployment
  hosts.
- `DEPLOY_KNOWN_HOSTS`: verified `known_hosts` entries for
  `prime-nyc1-9471aeba.junon.io` and `68.183.126.88`. Generate and verify these
  out of band; do not disable SSH host-key checking in the workflow.
- `SENTRY_AUTH_TOKEN`: a Sentry token permitted to create releases and upload
  source maps for the `junon-client` project in the `junon` organization.
- `FIREBASE_SERVICE_ACCOUNT`: Firebase Admin service-account JSON permitted to
  write the production Realtime Database node revision.

The server's `~/junon` checkout must already have non-interactive read access to
`origin` and be on `master`, as it executes `git pull origin master && npm ci`.

## Operational behavior

Deployments are serialized so client uploads and server dependency installation
cannot overlap. JavaScript source maps are sent to Sentry but excluded from the
web-host rsync upload.

The server deployment command only updates the checkout and installs
dependencies; it does not restart healthy services. A revision signal starts a
separate graceful rollout, described below. The `packages/junon-io-watchdog/`
service only restarts workers that fail their liveness probe and is not a
deployment hook.

## Graceful game-server rollout

After the new code is present on a node, the workflow sets its Firebase node
revision to the new seven-character Git revision:

```text
/nodes/<REGION>/<NODE_NAME>/revision
```

The workflow targets the production node `nyc1/prime-nyc1-9471aeba`.

The legacy global `/revision` field is still watched by the watchdog. Changing
it makes the watchdog run its liveness checks, but it does not compare worker
revisions or restart healthy old-revision workers. Its forwarding of that value
to `/nodes/<REGION>/<NODE_NAME>/revision` is disabled, so `/revision` alone
does not start this graceful rollout.

The matchmaker watches the node revision and rolls the node's game-server
workers forward without interrupting active games:

1. It compares each worker's advertised revision with the node revision.
   Workers on the old revision become unavailable for new work.
2. A worker with no active sectors is sent a `Restart` command after a 30-second
   delay.
3. The game server exits only after it has no active games. Its existing
   `junon-io@N` systemd unit starts it again, now loading the updated checkout.
4. For a worker that still has sectors, the matchmaker waits. When its sector
   count reaches zero, it sends the same delayed restart command.

The trigger is the **active sector/game count**, not player count alone. The
current delayed restart-on-player-count path is disabled, so an empty but still
running sector prevents that worker from restarting. This is intentional to
avoid terminating an active game, but an empty sector that never closes can
delay its update indefinitely.

Update the node revision only after that node's `git pull` and `npm ci` have
succeeded. The workflow makes that update only after its SSH deployment step;
otherwise a gracefully restarted worker can come back on the old revision while
the matchmaker expects the new one.

## Watchdog rename migration

The package and systemd unit were renamed from `junon-io-updater` to
`junon-io-watchdog` to reflect their liveness-only role. The new unit runs the
watchdog from the deployed `/root/junon` checkout. On each production host, run:

```sh
systemctl stop junon-io-updater
systemctl disable junon-io-updater
install -m 644 /root/junon/packages/junon-io-watchdog/junon-io-watchdog.service /etc/systemd/system/junon-io-watchdog.service
systemctl daemon-reload
systemctl enable --now junon-io-watchdog
```

Confirm the new service is active before removing the old standalone updater
directory.

## Rollback

To roll back, revert the relevant commit on `master` and push the revert. This
creates a new deployment using the reverted source revision. If a server process
restart is later added, its rollback procedure must be documented alongside it.
