# Outcome

Players of builds without Steam (itch.io, direct downloads) can host co-op
and have friends join over the internet without port forwarding or a VPN.
The host clicks "Host online", gets a short room code (`K7QF-2M9X`), and
passes it on; a friend types it under Join co-op. Game traffic goes peer to
peer over a WebRTC data channel. A small signalling server we run
(`packages/junon-signal`) pairs the two and never sees game traffic.

Acceptance criteria:

- In the desktop app with a signalling server configured, the host clicks
  **Host online and play** and gets a room code in the Host panel and in
  chat. A guest who enters it joins the world as their own character.
  Dropped connections reconnect through the same code.
- A wrong code, an unreachable service and a host on another version give a
  clear message in the menu before the menu closes.
- LAN/direct-address and Steam co-op keep working unchanged; all three can be
  open at once. Without a signalling server (no `JUNON_SIGNAL_URL` and no
  built-in default, `npm run server`, browser client), nothing changes and the
  online controls are hidden.
- Hosting ends as it does now (stop, switch world, quit): online guests get
  `PlayerKick` with the reason and the room closes.
- Guessing codes is impractical: about 39 bits per code, and the signalling
  server refuses an address after 20 wrong codes a minute.

## Context

- Steam co-op ([steam-coop.md](steam-coop.md)) built the seam this reuses:
  main relays whole frames over the desktop channel, and the game server
  turns each relayed connection into a guest socket with the `ws` socket's
  shape. The Steam framing (`junon-common/steam_framing.js`) already
  fragments frames and carries a control hello with the protocol hash.
- Electron's main process has no WebRTC; Chromium (renderers) does. The game
  page is sandboxed and changes between menu and game; the game server runs
  in a Node utility process.
- WebRTC needs signalling (exchanging offers, answers and ICE candidates)
  and, for some networks, a TURN relay.

## Progress

- [x] 2026-10-15: Signalling server with rooms, resume, throttling and
  STUN/TURN configuration; Node tests.
- [x] 2026-10-15: Game server: `RelaySocketBridge` shared by Steam and WebRTC,
  `hostWorldOnline`, room code in the hosting status; Jest.
- [x] 2026-10-15: Desktop host (hidden window + main relay), guest
  `RtcSocket`, menus; desktop e2e test over real WebRTC on one machine.
- [x] 2026-10-15: Signalling on Cloudflare: a Worker with a Durable Object
  per room (hibernating WebSockets, alarms), sharing `protocol.mjs` with the
  Node server; host keepalive; both backends under one test suite and the
  desktop WebRTC test.
- [ ] Deploy the Worker and set `DEFAULT_SIGNAL_URL` for release
  builds (with packaging, Phase 9 of
  [electron-offline-coop.md](electron-offline-coop.md)).
- [ ] Manual validation across real networks (see Validation); decide on
  TURN from the failure rate.

## Implementation

Signalling (`packages/junon-signal`; the protocol is described at the top of
`src/signal_server.js`). Production runs the Cloudflare Worker
(`worker/index.mjs`): the stateless Worker reads `?v=&role=&code=` from the
connection URL, checks the client's `AddressLimits` object, and hands the
socket to the `Room` Durable Object named by the code, so a host and its
guests meet in one instance. Rooms hibernate: state lives in socket
attachments and storage, deadlines in one alarm, and the host's 30 s `ping`
gets `pong` from Cloudflare without waking the room. The Node server
(`src/signal_server.js`) speaks the same protocol for development, tests and
self-hosting. A host gets a room with a code and a
resume token; a guest joins by code; the server relays `signal` messages
between them, tagging the host's side with a server-made `peerId`. A `lookup`
lets the menu check a code and the host's protocol hash before closing. ICE
servers come from the signalling server (default: public STUN; TURN through
`JUNON_SIGNAL_TURN_URLS`/`JUNON_SIGNAL_TURN_SECRET`, coturn-style
time-limited credentials), so release builds don't embed TURN secrets.

Host, in the desktop app:

1. The server's `hostWorldOnline` sets `Server#onlineHost` and posts
   `rtcHosting { isHosting, worldName, protocolHash }`.
2. `src/rtc_host.js` (main) opens a hidden, sandboxed window
   (`src/rtc_host/`, `backgroundThrottling: false`) that holds the room and
   the `RTCPeerConnection`s, answers each guest's offer, and moves raw data
   channel messages. The window applies send back-pressure
   (`bufferedAmount`), and a graceful close delivers what's queued first.
3. Main reassembles frames, relays `rtcOpen { connectionId, address }`,
   `rtcFrame`, `rtcClose` to the server, and sends `rtcRoom { code }` once
   the room exists (or `rtcHostingFailed`, which ends online hosting only).
4. `server/util/rtc_socket_bridge.js` (on `relay_socket_bridge.js`, which
   `steam_socket_bridge.js` now also uses) checks the hello and makes guest
   sockets with `isRtc` and `remoteAddress` set to the guest's IP as the
   host's ICE agent reached it (`getStats`), or `rtc:<id>` through a TURN
   relay.

Guest, in the game page: `client/src/util/rtc_socket.js` is a WebSocket-like
socket for `rtc:<code>` URLs. It joins the room, offers a reliable, ordered
data channel `junon`, trickles candidates, says hello (transport version and
protocol hash), and opens on `welcome`. `GameConnection` picks it for `rtc:`
URLs, so reconnects go through the room again.

## Validation

- `npm test --workspace packages/junon-signal`, each test against both
  backends (the Worker in `workerd` through Miniflare): pairing and relaying,
  lookups, keepalive, wrong-code throttling, malformed and wrong-version
  messages, room resume with and without the token, room expiry and guest
  lifetime (alarms), rooms per address, TURN credentials.
- `test/server/steam_coop.test.js`: online hosting through the desktop
  channel: `rtcHosting`, `rtcRoom`, hello version check, guests with and
  without an address, owner-profile refusal, stop.
- `packages/junon-desktop/test/desktop.spec.js` "hosts online with a room
  code...": two Electron instances, a local signalling server with no STUN
  servers, real WebRTC; run once per backend. Covers wrong code, malformed code, version mismatch,
  joining, reconnecting, the Host panel's code, stop with reason, hosting
  again, and the host quitting.
- Manual, still to do: two machines on different home networks (and one on
  mobile tethering, which is often symmetric NAT); one behind a corporate or
  university firewall; record how often ICE fails without TURN, the join
  time, and ping versus direct-address co-op.

## Decisions

- 2026-10-15: Signalling through our own small server, not public relays
  (trystero over Nostr/MQTT) and not copy-pasted offers. Owner's choice: best
  join UX, under our control. Game traffic stays peer to peer.
- 2026-10-15: TURN is configurable on the signalling server and off by
  default (public STUN only). Players whose networks block direct connections
  are told to use direct-address co-op or a VPN.
- 2026-10-15: The host's peer connections live in a hidden window, not in
  the game page (which reloads and renders) and not in Node through a native
  WebRTC addon (one more native dependency to package for three platforms).
  The guest's live in the game page, as an ordinary socket.
- 2026-10-15: Framing is the Steam co-op framing in 64 KB pieces, every
  Chromium's safe data channel message size, with its own
  `RTC_TRANSPORT_VERSION` (`junon-common/rtc_transport.js`). Main does the
  framing on the host so the hidden window only moves bytes.
- 2026-10-15: No join password for online hosting: the code is the key, and
  the host can stop hosting to close the room. Guests keep their
  self-asserted local profile ids, as LAN guests do.
- 2026-10-15: The desktop app turns off Chromium's mDNS host-candidate
  hiding (`WebRtcHideLocalIpsWithMdns`) so peers on one LAN, or one machine,
  connect directly. A guest learns the host's local and public IP addresses,
  which a host on direct-address co-op shares anyway.
- 2026-10-15: The signalling server doesn't depend on `junon-common`, so it
  deploys alone; its few constants are repeated in `rtc_transport.js`.
- 2026-10-15: Production signalling on Cloudflare Workers with Durable
  Objects (owner's choice): no server to run, TLS and client addresses for
  free, and hibernation makes a hosted room cost a few seconds per join.
  The Node server stays, on the same protocol and tests.
- 2026-10-15: Clients put role and code in the URL query, because the
  Worker must choose the room's Durable Object when the socket opens, before
  any message. The resume token stays in the first message, out of URLs and
  logs. A wrong token is now refused on both backends (before, the Node
  server gave a new room), since a Durable Object can't move a socket to
  another code.
- 2026-10-15: Keepalive comes from the host as text `ping`/`pong`, not
  server pings, which would wake the room. The host reopens a connection
  without a pong for 75 s; a room counts a host silent for 90 s as gone.
- 2026-10-15: On the Worker, hosts are limited by rooms opened per address
  per 10 minutes rather than rooms open at once (that would need a count
  across rooms), and there is no per-address connection cap.

## Discoveries and risks

- 2026-10-15: A hidden window keeps Electron alive after the game window
  closes (`window-all-closed` never fires), so closing the game window now
  quits explicitly.
- 2026-10-15: The client's `LocalWorldApi` lists its methods; a server API
  method also needs an entry there, not only in main's allowlist.
- Without TURN, some pairs can't connect (symmetric NAT on both sides, UDP
  blocked). Measure before paying for TURN.
- World thumbnails for online guests are broken, as for Steam guests: the
  URL is built from the connection URL.
- The Node server is a single process with in-memory rooms; a restart drops
  rooms, and hosts reconnect and get new codes (shown again in chat). The
  Worker keeps rooms in Durable Object storage, so a deploy doesn't lose
  them, though it does drop the sockets.
- 2026-10-15: Miniflare never evicts objects, so tests don't prove that rooms
  survive hibernation; the room keeps no in-memory state besides its
  configuration, by design. Check on Cloudflare after the first deploy.
- Rollback: release builds without `DEFAULT_SIGNAL_URL` hide online co-op;
  the other co-op modes don't depend on it.

## Result

Online co-op works end to end on one machine over real WebRTC (desktop e2e),
with the signalling server, server bridge and protocol covered by tests.
The Cloudflare Worker passes the same tests as the Node server and carries
the desktop WebRTC test. Not yet: a deployed Worker, release configuration,
and checks across real networks.
