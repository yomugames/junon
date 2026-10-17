# Outcome

Online hosts can mark a room Public or Private in the Visibility section above its code. Public rooms
appear in Join co-op's browser; private rooms remain joinable by code. Game
traffic stays on the existing WebRTC path.

## Context

`packages/junon-signal` has Node and Cloudflare Worker implementations of
the room protocol. The desktop hidden window owns the host signalling socket;
the game renderer owns the menu. See `ARCHITECTURE.md` and `docs/homepage.md`.

## Progress

- [x] 2026-10-16: Add compatible visibility updates and a bounded public directory to both signalling backends.
- [x] 2026-10-16: Add the desktop visibility control and room browser.
- [x] 2026-10-16: Verify the service contract and desktop join flow.

## Implementation

Keep new rooms private by default. Let only the connected host change its
visibility. List public rooms through an HTTP endpoint; validate entries
against live rooms in the Worker. Preserve code joins for either visibility.
Pass visibility commands through the desktop's existing hidden host window.

## Validation

Run the shared signalling suite, build the client, and run the desktop online
co-op test under a display. Check that private rooms stay absent, public rooms
appear, and switching back removes them without ending the room.

## Decisions

- 2026-10-16: Discovery is centralized in the signalling service; simulation
  and game messages still use the existing peer connection.
- 2026-10-16: The directory is opt-in and private by default. The room code
  works in either mode, so existing invitations keep working.

## Discoveries and risks

Released clients use signalling protocol version 1. Changes must be additive;
an older service does not support browsing or visibility updates, so a new
client must report that failure rather than claim a room became public.

## Result

Both signalling backends pass the shared 20-test suite. A standalone client
build passes. The desktop test passes against both Node and Worker signalling:
private by default, public listing, browser join, and removal after switching
back to Private. The deployed Cloudflare service needs the `v2` migration and
new Worker code before released clients can use the browser.
