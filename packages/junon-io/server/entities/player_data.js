const BaseTransientEntity = require('./base_transient_entity')
const Owner = require('../../common/interfaces/owner')

class PlayerData extends BaseTransientEntity {

  /*
    data: {
      uid:
      name:
      hasAccount:
    }
  */
  constructor(sector, data) {
    super(sector.game, data.id)

    this.sector = sector
    this.uid  = data.uid
    this.name  = data.name
    this.data  = data

    this.initOwner()

    this.game.addPlayerData(this)

    if (this.getTeam()) {
      this.getTeam().addOfflineMember(this.data)
    }

    this.createTimestamp = this.game.timestamp
  }

  getTeam() {
    if (!this.data.team) return null

    let teamId = this.data.team.id
    return this.game.teams[teamId]
  }

  isRegisteredAccount() {
    return false
  }

  getBuildOwner() {
    return this
  }

  getUID() {
    return this.uid
  }

  getSessionId() {
    return this.data.sessionId
  }

  getName() {
    return this.name
  }

  hasFollower() {
    return false
  }

  setFollower() {
    
  }

  isPlayerData() {
    return true
  }

  getAlliance() {
    return this.getTeam()
  }

  progressTutorial() {

  }

  getPlayer() {
    return null
  }

  remove() {
    super.remove()

    this.game.removePlayerData(this)

    if (this.getTeam()) {
      this.getTeam().removeOfflineMember(this.data)
    }
  }
}

Object.assign(PlayerData.prototype, Owner.prototype, {
})

module.exports = PlayerData
