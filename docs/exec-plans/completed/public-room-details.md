# Outcome

Public room cards show the live player count, capacity, and the host world's
preview thumbnail when one exists. Private rooms remain absent. Joining stays
on the existing WebRTC path.

## Context

The game server knows `Game#getPlayerCount`, `Game#getMaxPlayers`, and the
saved colony thumbnail. Electron's hidden host window owns signalling. The
Node and Cloudflare signalling backends share protocol version 1. See
`ARCHITECTURE.md`, `docs/homepage.md`, and the completed public browser plan.

## Progress

- [x] 2026-10-16: Trace player counts, saved previews, and directory contracts.
- [x] 2026-10-16: Send bounded room details from the host to both signalling backends.
- [x] 2026-10-16: Render details in the public browser with missing-data fallbacks.
- [x] 2026-10-17: Verify Node, Worker, and desktop flows.

## Implementation

Add an internal local API for live count/capacity and a small preview JPEG.
Poll it while online hosting and send additive signalling details, including
on reconnect. Validate counts and image size/type before signalling state
changes. Include details only for live public rooms in `/rooms`. The client
renders a preview or placeholder and a player count, preserving older server
responses without these fields.

## Validation

Run the shared signalling tests for both backends, a standalone client build,
and the focused desktop online co-op test. Capture the public browser with a
room preview and player count.

## Decisions

- 2026-10-16: Use the existing colony preview thumbnail; do not capture or
  upload a new image without the host choosing one.
- 2026-10-16: Keep the signalling version at 1 with optional detail fields and
  bounded metadata messages. Older clients and services continue to join by
  code; missing details show placeholders.

## Discoveries and risks

Signalling WebSocket frames have a 16 KiB limit, so the preview must be
resized and capped before sending. Counts can lag the server by the poll
interval. Public preview images are visible to anyone browsing rooms.
WebRTC guests cannot load the host's HTTP screenshot gallery; when a screenshot
exists, their in-game gallery now shows an unavailable message instead of an
invalid `rtc:` image URL. The room browser receives its own public preview.

## Result

Public browser cards show a bounded colony preview and current player count
with capacity, or placeholders if details are missing. The host refreshes
details every five seconds and both signalling backends expose them only while
the room is public and live. Protocol version 1 remains compatible because
these fields are optional; the release Worker needs the updated code deployed
to show the new details, with no new Durable Object migration.

Validation: `npm test --workspace packages/junon-signal` passed 22 tests;
`NODE_ENV=standalone npm run client:build` passed; the focused desktop online
co-op test passed on Node and Worker signalling (2 tests). The screenshot
helper captured the populated browser at
`/tmp/junon-public-room-details/join_menu_public.png`.
