const RtcTransport = require('junon-common/rtc_transport')
const RelaySocketBridge = require('./relay_socket_bridge')

// WebRTC co-op guests on the game server. The desktop shell owns the peer
// connections (packages/junon-desktop/src/rtc_host.js) and relays whole
// frames over the desktop channel (relay_socket_bridge.js):
//
//   from main: rtcOpen { connectionId, address }
//              rtcFrame { connectionId, kind, data }
//              rtcClose { connectionId }
//   to main:   rtcFrame { connectionId, kind, data }
//              rtcClose { connectionId, isGraceful }
//
// address is the guest's IP address as the host's ICE agent reached it, or
// null when the guest came through a TURN relay, which many guests share. It
// becomes the socket's remoteAddress, so the per-address player limit and team
// bans work as for direct-address guests; without one, each connection gets
// its own rtc:<id>. RTC guest sockets have isRtc.

// IPv4, IPv6, or a Chromium mDNS host name
const ADDRESS_PATTERN = /^([0-9.]{7,15}|[0-9a-fA-F:.]{2,45}|[0-9a-f-]{36}\.local)$/

class RtcSocketBridge extends RelaySocketBridge {
  constructor(options) {
    super(options, 'rtc', RtcTransport.RTC_TRANSPORT_VERSION)
  }

  describeGuest(message) {
    let address = typeof message.address === 'string' && ADDRESS_PATTERN.test(message.address) ? message.address : null
    return { remoteAddress: address || 'rtc:' + message.connectionId, isRtc: true }
  }
}

module.exports = RtcSocketBridge
