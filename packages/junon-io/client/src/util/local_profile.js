const { v4: uuidv4 } = require('uuid')

// Offline identity for standalone mode, which has no accounts: an opaque id
// generated once per install plus the name the player chose. The server keys
// the player's saved character by the id, so it must never change.
const STORAGE_KEY = "junon_local_profile"

class LocalProfile {
  static load() {
    let data = {}

    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch(e) {
      data = {}
    }

    let profile = new LocalProfile(data)
    if (!profile.uid) {
      profile.uid = uuidv4().replace(/-/g, "")
      profile.save()
    }

    return profile
  }

  constructor(data) {
    this.uid = data.uid
    this.name = data.name
  }

  setName(name) {
    this.name = name
    this.save()
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid: this.uid, name: this.name }))
  }
}

module.exports = LocalProfile
