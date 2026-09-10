# Outcome

Rename the standalone liveness process from `junon-io-updater` to
`junon-io-watchdog`, without implying it deploys code or restarts healthy game
servers.

## Context

The process watches game-server liveness sockets and restarts only workers that
do not reply. Its historical build-update and revision propagation code is
disabled. The systemd unit previously ran the package from
`/root/junon-io-updater`.

## Progress

- [x] 2026-09-10: Mapped the watchdog's actual behavior and runtime unit.
- [x] 2026-09-10: Renamed package, directory, package-lock entries, and unit.
- [x] 2026-09-10: Documented the host migration.

## Implementation

1. Rename the workspace package and its systemd unit.
2. Change the unit description and installation path to `junon-io-watchdog`.
3. Update repository architecture and deployment documentation.
4. Preserve watchdog behavior; do not add deployment or immediate restart logic.

## Validation

- Run Node syntax validation for the watchdog source.
- Validate the package-lock references no old workspace path.
- Check the diff for whitespace errors.

## Decisions

- 2026-09-10: Use “watchdog” because liveness recovery is the process's active
  responsibility; its updater implementation is commented out.
- 2026-09-10: Retain a separate systemd service rather than changing process
  behavior as part of a naming migration.

## Discoveries and risks

The live hosts must be migrated manually because their current systemd unit
points to a host-local installation path. Keep the old service and directory
until the new unit, which runs from the deployed checkout, is active.

## Result

The repository calls the process a watchdog consistently and documents the
safe production-unit migration.
