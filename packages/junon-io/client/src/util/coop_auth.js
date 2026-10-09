const createHash = require('create-hash')
const createHmac = require('create-hmac')

// Joining a co-op host (server: Server#getJoinInfo, Server#authorizeGuest).
// The password never leaves this machine: the host's /info hands out a
// single-use challenge, and the client answers with
// HMAC-SHA256(key = SHA-256(password), challenge). Pure-JS hashing, because
// the desktop app's app:// page isn't a secure context and has no Web Crypto.
const CoopAuth = {
  async fetchInfo(address, query) {
    let response
    try {
      response = await fetch('http://' + address + '/info' + (query || ''))
    } catch (e) {
      throw new Error('Can\'t reach ' + address + '. Check the address and that the world is being hosted.')
    }

    if (!response.ok) throw new Error('The host runs a different version of Junon. Both players need the same version.')
    return response.json()
  },

  proof(password, challenge) {
    const key = createHash('sha256').update(password, 'utf8').digest()
    return createHmac('sha256', key).update(challenge).digest('hex')
  },

  // checks the version and the password before connecting, so problems get a
  // clear message instead of a failed socket
  async checkHost(address, password) {
    let info = await this.fetchInfo(address)

    if (info.protocolHash !== window.protocolHash) {
      const ownVersion = (document.querySelector('.game_version') || {}).textContent || 'another version'
      throw new Error('Version mismatch: the host runs Junon ' + info.version + ', you run ' + ownVersion + '. Both players need the same version.')
    }
    if (!info.requiresPassword) return
    if (info.isThrottled) throw new Error('Too many wrong passwords. Wait a minute and try again.')
    if (!password) throw new Error('This world needs a password')

    info = await this.fetchInfo(address, '?challenge=' + info.challenge + '&proof=' + this.proof(password, info.challenge))
    if (!info.passwordAccepted) {
      throw new Error(info.isThrottled ? 'Too many wrong passwords. Wait a minute and try again.' : 'Wrong password')
    }
  },

  // a fresh socket URL for each connection attempt, reconnects included,
  // since a challenge can only be used once
  async socketUrl(address, password) {
    let url = 'ws://' + address + '?protocol=' + encodeURIComponent(window.protocolHash)

    const info = await this.fetchInfo(address)
    if (info.requiresPassword) {
      url += '&challenge=' + info.challenge + '&proof=' + this.proof(password, info.challenge)
    }

    return url
  }
}

module.exports = CoopAuth
