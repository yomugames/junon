const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")

class Team {
  constructor(game, data) {
    this.game = game
    this.members = {}

    this.syncWithServer(data)    

    this.onTeamCreated()
  }

  getTeamKey() {
    return [this.id, this.game.sector.uid].join(":")
  }

  getInviteToken() {
    return this.game.sector.uid
  }

  isSectorOwner() {
    return this.creatorUid === this.game.creatorUid
  }

  syncWithServer(data) {
    this.data = data
    this.id = data.id
    this.ip = data.ip
    this.setName(data.name)
    this.isPrivate = data.isPrivate
    this.leader = data.leader
    this.creatorUid = data.creatorUid
    this.creatorName = data.creatorName
    this.deeds = data.deeds
    this.dayCount = data.dayCount
    this.prefix = data.prefix

    this.permissions = data.permissions

    let prevMembers = this.members
    if (this.isMyTeam()) {
      if (this.isBeingRemovedFromTeam(data)) {
        this.game.mapMenu.removePrevTeamMembers(prevMembers)
      }
    }

    this.members = data.members
    this.offlineMembers = data.offlineMembers

    this.updateRelationship()
    this.onTeamUpdated(prevMembers)
  }

  isBeingRemovedFromTeam(data) {
    if (!this.game.player) return false
    return !data.members[this.game.player.id]
  }

  isMyTeam() {
    if (!this.game.player) return false
    return this.members[this.game.player.id]
  }

  setName(name) {
    this.name = name
  }

  isCreator(member) {
    return member.name === this.creatorName
  }

  updateRelationship() {
    this.relationshipScore = this.calculateRelationshipScore()

    const prevRelationshipStatus = this.relationshipStatus
    this.relationshipStatus = this.getRelationshipStatus()

    if (this.relationshipStatus !== prevRelationshipStatus) {
      if (prevRelationshipStatus) {
        this.onRelationshipStatusChanged()
      }
    }
  }

  onRelationshipStatusChanged() {
    if (this.relationshipStatus === "Hostile") {
      this.game.displayError('Relationship.EmpireHostile', { warning: true })
    } else if (this.relationshipStatus === "Neutral") {
      this.game.displayError("Relationship.EmpireNeutral")
    } else if (this.relationshipStatus === "Friendly") {
      this.game.displayError("Relationship.EmpireFriendly", { success: true })
    }
  }

  getRelationshipStatus() {
    if (this.relationshipScore <= 40) {
      return "Hostile"
    } else if (this.relationshipScore < 60) {
      return "Neutral"
    } else {
      return "Friendly"
    }
  }

  calculateRelationshipScore() {
    let total = 0
    let baseScore = 60
    total += baseScore

    for (let deed in this.deeds) {
      total += Constants.Deeds[deed].effect
    }

    return total
  }

  hasMember(targetMember, members) {
    if (!targetMember) return false

    members = members || this.members

    return members[targetMember.id]
  }

  getMemberCount() {
    return Object.keys(this.members).length
  }

  getId() {
    return this.id
  }

  getName() {
    return this.name 
  }

  isLeader(member) {
    return this.leader && this.leader.id === member.id
  }

  isAdmin(member) {
    return member.roleType === Protocol.definition().RoleType.Admin &&
           this.hasMember(member)
  }

  isCreator(member) {
    return this.creatorName === member.name
  }

  getIpHex() {
    return this.ip.replace("ip_", "").replace(".junon.io","")
  }

  onTeamUpdated(prevMembers) {
    let isPlayerTeamMemberPreviously = this.hasMember(this.game.player, prevMembers)
    let isPlayerTeamMemberCurrently  = this.hasMember(this.game.player)

    if (isPlayerTeamMemberPreviously && !isPlayerTeamMemberCurrently) {
      this.onPlayerLeftTeam()
    } else if (this.hasMember(this.game.player)) {
      this.game.teamMenu.render(this)
      this.game.teamStatusMenu.showTeamMembers(this)
      // this.game.allianceMenu.render(this)
    }

    for (let id in this.members) {
      let player = this.game.sector.players[id]
      if (player) {
        player.onTeamChanged()
      }
    }
  }

  onPlayerLeftTeam() {
    this.game.teamStatusMenu.cleanup()
  }

  onTeamCreated() {
    // this.game.teamMenu.addTeam(this)

    if (this.hasMember(this.game.player)) {
      this.game.teamMenu.render(this)
      this.game.teamStatusMenu.showTeamMembers(this)
    }
  }

  remove() {
    // this.game.teamMenu.removeTeam(this)
  }


}

module.exports = Team