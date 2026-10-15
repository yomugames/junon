const SteamFraming = require('junon-common/steam_framing')
const RelaySocketBridge = require('./relay_socket_bridge')

// Steam co-op guests on the game server. The desktop shell's main process
// owns the Steam connections (packages/junon-desktop/src/steam_host.js) and
// relays whole frames over the desktop channel (relay_socket_bridge.js):
//
//   from main: steamOpen { connectionId, steamId }
//              steamFrame { connectionId, kind, data }
//              steamClose { connectionId }
//   to main:   steamFrame { connectionId, kind, data }
//              steamClose { connectionId, isGraceful }
//
// steamId comes from main, which reads it from the authenticated Steam
// connection; the guest can't choose it. Steam guest sockets have
// isSteam, steamId and remoteAddress steam:<id>.

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/

class SteamSocketBridge extends RelaySocketBridge {
  constructor(options) {
    super(options, 'steam', SteamFraming.STEAM_TRANSPORT_VERSION)
  }

  static isBridgeMessage(message) {
    return !!message && ['steamOpen', 'steamFrame', 'steamClose'].includes(message.type)
  }

  describeGuest(message) {
    let steamId = message.steamId
    if (typeof steamId !== 'string' || !STEAM_ID_PATTERN.test(steamId)) return null
    return { steamId: steamId, remoteAddress: 'steam:' + steamId, isSteam: true }
  }
}

module.exports = SteamSocketBridge
