const path = require("path")

// Steam integration (docs/exec-plans/active/steam-coop.md). Steamworks runs
// here in the main process, once per app; the game server never loads it and
// only sees Steam guests as sockets relayed over its parent port.
//
// Steam is optional and off for now (builds ship on itch.io); JUNON_STEAM=1
// turns it on. Anything that goes wrong - the binding or the Steamworks
// redistributable missing, Steam not running - leaves `isAvailable` false and
// the game works as without Steam.

// Valve's public test app ("Spacewar") until Junon has its own app id
const DEVELOPMENT_APP_ID = 480

// callbacks deliver connection state changes and incoming messages, so they
// run often while connections are open
const ACTIVE_POLL_MS = 10
const IDLE_POLL_MS = 100

class SteamRuntime {
  constructor() {
    this.isAvailable = false
    this.sdk = null
    this.pollers = new Set()
  }

  init() {
    if (process.env.JUNON_STEAM !== "1") return false

    let appId = parseInt(process.env.JUNON_STEAM_APP_ID || DEVELOPMENT_APP_ID, 10)
    if (!Number.isInteger(appId) || appId <= 0) {
      console.log("Steam: invalid JUNON_STEAM_APP_ID, Steam features are off")
      return false
    }

    try {
      // tests swap in an in-memory Steam (test/support/fake_steam.js)
      let SteamworksSDK = require(process.env.JUNON_STEAM_FAKE_SDK ? path.resolve(process.env.JUNON_STEAM_FAKE_SDK) : "steamworks-ffi-node").default
      let sdk = SteamworksSDK.getInstance()

      // the Steamworks redistributable isn't in the repository (Valve's
      // license); point JUNON_STEAMWORKS_SDK at an unpacked SDK's `sdk/`
      // directory, which holds redistributable_bin/
      if (process.env.JUNON_STEAMWORKS_SDK) sdk.setSdkPath(path.resolve(process.env.JUNON_STEAMWORKS_SDK))

      // init fails when Steam isn't running or doesn't own the app
      if (!sdk.init({ appId: appId })) {
        console.log("Steam: not running or init failed, Steam features are off")
        return false
      }

      this.sdk = sdk
      this.appId = appId
      this.isAvailable = true
    } catch (e) {
      console.log("Steam: unavailable (" + e.message + "), Steam features are off")
      return false
    }

    // P2P connections go through the Steam Datagram Relay; start measuring
    // routes now so the first connection doesn't wait for it
    this.sdk.networkingUtils.initRelayNetworkAccess()
    this.schedulePoll()

    console.log("Steam: ready as " + this.getStatus().steamId + " (app " + this.appId + ")")
    return true
  }

  getStatus() {
    if (!this.isAvailable) return { isAvailable: false }

    let status = this.sdk.getStatus()
    return {
      isAvailable: true,
      steamId: status.steamId,
      personaName: this.sdk.friends.getPersonaName()
    }
  }

  get networking() {
    return this.sdk.networkingSockets
  }

  // poller: { poll(), isActive() } - run after Steam's own callbacks
  addPoller(poller) {
    this.pollers.add(poller)
  }

  schedulePoll() {
    let isActive = Array.from(this.pollers).some((poller) => poller.isActive())
    this.pollTimer = setTimeout(() => this.poll(), isActive ? ACTIVE_POLL_MS : IDLE_POLL_MS)
  }

  poll() {
    try {
      this.sdk.runCallbacks()
      this.sdk.networkingSockets.runCallbacks()
      this.pollers.forEach((poller) => poller.poll())
    } catch (e) {
      console.error("Steam: callback error", e)
    }

    if (this.isAvailable) this.schedulePoll()
  }

  shutdown() {
    if (!this.isAvailable) return

    clearTimeout(this.pollTimer)
    this.isAvailable = false
    try {
      this.sdk.networkingSockets.closeAll()
      this.sdk.shutdown()
    } catch (e) {
      console.error("Steam: shutdown error", e)
    }
  }
}

// ESteamNetworkingConnectionState values used by steam_host.js and
// steam_guest.js
SteamRuntime.STATE_CONNECTED = 3
SteamRuntime.STATE_CLOSED_BY_PEER = 4
SteamRuntime.STATE_PROBLEM_DETECTED_LOCALLY = 5

// end reason for connections Junon closes (k_ESteamNetConnectionEnd_App_Min)
SteamRuntime.END_REASON_APP = 1000

module.exports = SteamRuntime
