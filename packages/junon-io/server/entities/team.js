const BaseTransientEntity = require('./base_transient_entity')
const Protocol = require('../../common/util/protocol')
const Owner = require('../../common/interfaces/owner')
const Constants = require('../../common/constants')
const FirebaseAdminHelper = require("../util/firebase_admin_helper")
const EventBus = require('eventbusjs')
const SectorModel = require("junon-common/db/sector")
const SectorBanModel = require("junon-common/db/sector_ban")
const Role = require("./role")

class Team extends BaseTransientEntity {
  constructor(sector, data = {}) {
    super(sector.game, data.id)

    this.score = 0
    this.sector = sector

    this.applyData(data)

    this.turretCount = 0
    this.wallCount = 0
    this.trapCount = 0
    this.doorCount = 0
    this.structureCount = 0

    this.ipBlacklist = {}
    this.uidBlacklist = {} // for kicks

    this.members = {}
    this.offlineMembers = {}
    this.changedMapPositions = {}
    this.residents = {}
    this.roles = {}

    this.ownershipCounts = {}

    if (data.roles) {
      this.loadRoles(data.roles)
    } else {
      this.createDefaultRoles()
    }

    this.initOwner()

    this.onTeamCreated()
  }

  isTeam() {
    return true
  }

  isCreatorTeam() {
    let isCreatorMatch = this.creatorUid === this.game.creatorUid
    let isLeaderMatch = this.leaderUid === this.game.creatorUid
    return isCreatorMatch || isLeaderMatch
  }

  setPrefix(prefix) {
    this.prefix = prefix
    this.onTeamChanged()
  }

  setScoreColor(scoreColor) {
    this.scoreColor = scoreColor
  }

  setScoreIndex(scoreIndex) {
    this.scoreIndex = scoreIndex
  }

  getSlaveRole() {
    return this.getRole(Team.SlaveRoleType)
  }

  getRole(roleType) {
    return this.roles[roleType]
  }

  getRoleByName(name) {
    if (!name) return null

    let target

    for (let id in this.roles) {
      let role = this.roles[id]
      if (role.name.toLowerCase() === name.toLowerCase()) {
        target = role
        break
      }
    }

    return target
  }

  loadRoles(roles) {
    for (let id in roles) {
      let roleData = roles[id]
      roleData.team = this
      new Role(roleData)
    }
  }

  removeRole(role) {
    delete this.roles[role.id]
    this.onRoleRemoved(role.id)
  }

  onRoleRemoved(roleId) {
    for (let memberId in this.members) {
      let member = this.members[memberId]
      if (member.roleType === roleId) {
        member.setRoleType(Team.GuestRoleType)
      }
    }

    this.onTeamChanged()
  }

  isMaxRoleCountReached() {
    return this.getRoleCount() >= 20
  }

  getRoleCount() {
    return Object.keys(this.roles).length
  }

  createDefaultRoles() {
    if (this.game.isPvP()) {
      this.createMemberRole()
      this.createAdminRole()
    } else {
      this.createGuestRole()
      this.createMemberRole()
      this.createAdminRole()
    }
  }

  createGuestRole() {
    let role = new Role({ id: 0, name: "Guest", team: this })
  }

  createMemberRole() {
    let role = new Role({ id: 1, name: "Member", team: this })
    role.allowAll()
    role.setPermissions({
      SellToTrader: false,
      EditSign: false,
      Kick: false,
      Ban: false,
      UseCommands: false,
      EditCommandBlocks: false
    })
  }

  createNewRole() {
    let highestId = Math.max(...Object.keys(this.roles))
    // if highest id is 2, next should be 4. 3 reserved for slave

    let newRoleId = highestId === 2 ? 4 : (highestId + 1)

    let options = {
      id: newRoleId,
      team: this,
      name: "Role" + newRoleId
    }

    let role = new Role(options)
    role.onRoleChanged()
  }

  createAdminRole() {
    let role = new Role({ id: 2, name: "Admin", team: this })
    role.allowAll()
    role.setPermissions({
      Kick: false,
      Ban: false,
      UseCommands: false,
      EditCommandBlocks: false
    })
  }

  applyData(data) {
    this.ip = this.game.server.getHost()
    this.setName(data.name)
    this.joinable = !!data.joinable
    this.dayCount = data.dayCount || 1

    if (data.leaderUid) {
      this.leaderUid = data.leaderUid
    } else if (data.leader) {
      this.leaderUid = data.leader.uid
      this.leader   = data.leader
    }

    if (data.deeds) {
      this.deeds = data.deeds
    } else {
      this.deeds = {}
    }

    this.creatorUid = data.creatorUid
    this.creatorName = data.creatorName

    this.permissions = {
      accessStorage: parseInt("1110", 2) // slave/admin/member
    }

    if (data.permissions) {
      for (let name in this.permissions) {
        if (data.permissions[name]) {
          this.permissions[name] = data.permissions[name]
        }
      }
    }

    if (this.isCreatorTeam()) {
      this.isPrivate = this.sector.isPrivate
    } else {
      this.isPrivate = !!data.isPrivate
    }
  }

  isAllowedToView(roleType) {
    return (this.permissions.accessStorage >> roleType) % 2 === 1
  }

  editPermission(permission, roleId, isEnabled) {
    if (typeof this.permissions[permission] === 'undefined') return

    if (!isEnabled) {
      // and operation against bit index with 0 while rest is 1
      let disableMask = ~(1 << roleId)

      this.permissions[permission] = this.permissions[permission] & disableMask
    } else {
      // or operation against bit index with 1 while rest is 0
      let enableMask = (1 << roleId)

      this.permissions[permission] = this.permissions[permission] | enableMask
    }

    this.onTeamChanged()
  }

  getCreator() {
    return Object.values(this.members).find((member) => {
      return member.getUid() === this.creatorUid
    })
  }

  setCreator(player) {
    this.creatorUid = player.getUid()
    this.creatorName = player.getName()
  }

  getRandomRoom() {
    let roomKeyList = Object.keys(this.rooms)
    let randomIndex = Math.floor(Math.random() * roomKeyList.length)
    let randomKey = roomKeyList[randomIndex]
    return this.rooms[randomKey]
  }

  addDeed(deed) {
    if (this.game.isPeaceful()) return

    this.deeds[deed] = this.dayCount
    this.onTeamChanged()
  }

  hasDeed(deed) {
    return this.deeds[deed]
  }

  getRelationshipStatus() {
    let relationshipScore = this.calculateRelationshipScore()
    if (relationshipScore <= 40) {
      return "Hostile"
    } else if (relationshipScore < 60) {
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

  removeDeed(deed) {
    if (this.game.isMiniGame()) return

    delete this.deeds[deed]
  }

  getAsteroidRoomWithMiningDrill() {
    let result

    for (let roomId in this.rooms) {
      let room = this.rooms[roomId]
      if (room.hasMiningDrill()) {
        result = room
        break
      }
    }

    return result
  }

  getMiningDrillCount() {
    let count = 0

    for (let id in this.ownerships.structures) {
      let structure = this.ownerships.structures[id]
      if (structure.getType() === Protocol.definition().BuildingType.MiningDrill) {
        count += 1
      }
    }

    return count
  }

  hasOwnership(entity) {
    if (!entity.owner) return false
    if (entity.owner === this) return true
    if (this.hasMember(entity.owner)) return true

    return false
  }

  getBeds() {
    let result = []

    for (let buildingId in this.ownerships.structures) {
      let structure = this.ownerships.structures[buildingId]
      if (structure.type === Protocol.definition().BuildingType.Bed) {
        result.push(structure)
      }
    }

    return result
  }

  getBeacons() {
    let beacons = []
    for (let buildingId in this.ownerships.structures) {
      let structure = this.ownerships.structures[buildingId]
      if (structure.type === Protocol.definition().BuildingType.Beacon) {
        beacons.push(structure)
      }
    }

    return beacons
  }

  getRandomBeacon() {
    let beacons = this.getBeacons()
    let randomIndex = Math.floor(Math.random() * beacons.length)

    return beacons[randomIndex]
  }

  hasMember(member) {
    return this.members[member.getId()]
  }

  getAttackables() {
    return this.leader.getAttackables()
  }

  getLandedMember(options = {}) {
    let landed

    for (let memberId in this.members) {
      let member = this.members[memberId]
      if (!member.sector.isLobby()) {
        if (options.exclude && options.exclude === member) {
          continue
        }

        landed = member
        break
      }
    }

    return landed
  }

  incrementDayCount() {
    this.dayCount += 1
    this.onDayCountChanged()
    this.onTeamChanged()
  }

  onDayCountChanged() {
    this.expireDeeds()
  }

  expireDeeds() {
    for (let deed in this.deeds) {
      let deedDay = this.deeds[deed]
      let deedDuration = this.dayCount - deedDay
      if (deedDuration >= 3) {
        this.removeDeed(deed)
      }
    }
  }

  isDeedAlmostExpiring(deed) {
    let deedDay = this.deeds[deed]
    let deedDuration = this.dayCount - deedDay
    return deedDuration >= 2
  }

  getMembers() {
    return Object.values(this.members)
  }

  getOfflineMembers() {
    return Object.values(this.offlineMembers)
  }

  getAdmins() {
    let members = this.getMembers()
    return members.filter((member) => {
      return member.isAdmin()
    })
  }

  getLeader() {
    return this.leader
  }

  getInviteApprovers() {
    let leader = this.getLeader()
    if (leader) return [leader]

    let admins = this.getAdmins()
    if (admins.length > 0) return admins

    if (this.getMembers()[0]) {
      return [this.getMembers()[0]]
    }

    return []
  }

  getRandomApprovedMember() {
    let result

    for (let memberId in this.members) {
      let member = this.members[memberId]
      if (member.hasMemberPrivilege()) {
        result = member
        break
      }
    }

    return result
  }

  setLeader(player) {
    this.leader = player
    this.leaderUid = player.getUid()
    player.setRoleType(Team.AdminRoleType)
    this.onMemberChanged()
  }

  canAcceptRequests(player) {
    return this.getLeader() === player
  }

  sendChangedMapPositions() {
    let positionsJson = this.getChangedMapPositionsJson()

    if (positionsJson.length > 0) {
      this.forEachMember((player) => {
        this.getSocketUtil().emit(player.getSocket(), "MapPositions", { positions: positionsJson })
      })
    }

    this.clearChangedMapPositions()
  }

  forEachRole(cb) {
    for (let id in this.roles) {
      let role =this.roles[id]
      cb(role)
    }
  }

  clearChangedMapPositions() {
    this.changedMapPositions = {}
  }

  getChangedMapPositionsJson() {
    let mapPositions = []
    let mapPosition

    for (let entityId in this.changedMapPositions) {
      let data = this.changedMapPositions[entityId]

      mapPositions.push(data)
    }

    return mapPositions
  }

  getEntityType(entity) {
    if (entity.isPlayer()) {
      return Protocol.definition().EntityType.Player
    } else if (entity.hasCategory("worker")) {
      return Protocol.definition().EntityType.Slave
    } else if (entity.isMob()) {
      return Protocol.definition().EntityType.Mob
    } else {
      throw new Error("Invalid entity in mapPositions: " + entity.constructor.name)
    }
  }

  addChangedMapPosition(entity, options = {}) {
    let data = {
      id: entity.getId(),
      type: this.getEntityType(entity),
      x: Math.floor(entity.getX()),
      y: Math.floor(entity.getY())
    }

    if (isNaN(data.x) || isNaN(data.y)) {
      return
    }

    if (options.isRemoved) {
      data["clientMustDelete"] = true
    }

    this.changedMapPositions[entity.id] = data
  }

  isJoinable() {
    return this.joinable
  }

  setName(name) {
    this.name = this.getNormalizedName(name)
    this.onTeamChanged()
    this.onTeamNameChanged()
  }

  getNormalizedName(name) {
    try {
      return decodeURIComponent(escape(name))
    } catch(e) {
      return name
    }
  }

  async setPrivate(isPrivate) {
    if (this.game.isPvP()) return
    if (this.game.isMiniGame()) return

    this.isPrivate = isPrivate
    this.onTeamChanged()

    let sectorModel = await SectorModel.findOne({
      where: { uid: this.game.getSectorUid() }
    })

    if (sectorModel) {
      await sectorModel.update({ isPrivate: this.isPrivate })
    }

    this.sector.setIsPrivate(this.isPrivate)
  }

  update(data) {
    for (let key in data) {
      this[key] = data[key]
    }

    this.onTeamChanged()
  }

  // only for joinable teams (personal default team dont get sent to client)
  onTeamChanged(data) {
    if (!this.isJoinable()) return
    if (this.game.isTutorial) return

    if (this.sector.shouldShowPlayerList()) {
      if (data) {
        data.id = this.getId()
        this.getSocketUtil().broadcast(this.game.getSocketIds(), "TeamUpdated", { team: data })
      } else {
        this.getSocketUtil().broadcast(this.game.getSocketIds(), "TeamUpdated", { team: this })
      }
    }

    if (this.game.isMiniGame()) return

    if (this.isSectorOwner()) {
      // only for sector owner
      let teamData = this.getTeamData()
      this.game.sendToMatchmaker({ event: "TeamUpdated", data: teamData })
    }
  }

  getJsonWithoutMembers() {
    return {
      id: this.id,
      name: this.name,
      isPrivate: this.isPrivate,
      clientMustDelete: this.clientMustDelete,
      creatorUid: this.creatorUid,
      creatorName: this.creatorName,
      deeds: this.deeds,
      dayCount: this.dayCount,
      permissions: this.permissions
    }
  }

  async onTeamNameChanged() {
    if (this.game.sectorModel &&
        this.game.sectorModel.name === this.name) {
      return
    }

    if (this.shouldTeamNameChangeSectorName()) {
      await this.updateDatabaseSectorName()
      this.sector.setName(this.name)
    }

    this.sector.setTeamScoreboardChanged()
  }

  shouldTeamNameChangeSectorName() {
    if (this.game.isPvP()) return false
    if (!this.isSectorOwner()) return false

    return !this.sector.isLobby()
  }

  async updateDatabaseSectorName() {
    if (this.game.isMiniGame()) return

    let sectorModel = await SectorModel.findOne({
      where: { uid: this.game.getSectorUid() }
    })

    if (sectorModel) {
      await sectorModel.update({ name: this.name })
    }
  }

  getMemberSocketIds() {
    let socketIds = []

    this.forEachMember((member) => {
      let socketId = member.getSocket().id
      socketIds.push(socketId)
    })

    return socketIds
  }

  getSocketIds() {
    return this.getMemberSocketIds()
  }

  isFull() {
    if (this.game.isPvP()) {
      return this.getMemberCount() >= 5
    } else {
      return this.getMemberCount() >= 10
    }
  }

  canKick(user, member) {
    if (user.isSectorOwner()) return true
    if (member.isSectorOwner()) return false

    return user.getRole() && user.getRole().isAllowedTo("Kick")
  }

  canBan(user, member) {
    if (user.isGameDev()) return true
    if (user.isSectorOwner()) return true
    if (member.isSectorOwner()) return false

    return user.getRole() && user.getRole().isAllowedTo("Ban")
  }

  isAllowedToUnban(user) {
    if (user.isSectorOwner()) return true

    return user.getRole() && user.getRole().isAllowedTo("Ban")
  }

  kick(memberId, user) {
    let member = this.members[memberId]
    if (!member) return

    if (!this.canKick(user, member)) {
      user.showError("Permission Denied")
      return
    }

    if (this.game.sector.isDominationMinigame()) {
      member.throwAllInventory()
      this.removeMember(member)
      member.createSelfTeam()
      member.respawn()
      member.showError("You got kicked from team " + this.name)
      return
    }

    if (this.game.isMiniGame()) return

    let ip = member.getRemoteAddress()
    this.ipBlacklist[ip] = { timestamp: this.game.timestamp, type: 'kick' }
    let uid = member.getUid()
    if (uid) {
      this.uidBlacklist[uid] = { timestamp: this.game.timestamp, type: 'kick' }
    }

    this.removeMember(member)
    this.getSocketUtil().emit(member.getSocket(), "PlayerKick", {})
    member.kick()

    let actor = [user.name, user.getRemoteAddress()].join("-")
    LOG.info("[" + this.game.getSectorUid() + "] " + actor + " [kicked] " + member.name)

    return true
  }

  banOfflineMember(user, member) {
    if (!user.isSectorOwner()) return

    this.banInDatabase(member)
  }

  ban(memberId, user) {
    if (this.game.isMiniGame()) return

    let member = this.members[memberId]
    if (!member) {
      return
    }

    if (!this.canBan(user, member)) {
      user.showError("Permission Denied")
      return
    }

    this.removeMember(member)
    this.getSocketUtil().emit(member.getSocket(), "PlayerKick", { isBan: true })

    member.kick()
    this.banInDatabase(member)

    let actor = [user.name, user.getRemoteAddress()].join("-")
    LOG.info("[" + this.game.getSectorUid() + "] " + actor + " [banned] " + member.name)

    return true
  }

  async unban(banId, banner) {
    if (this.game.isMiniGame()) return
    if (this.game.isPvP()) return

    if (!this.isAllowedToUnban(banner)) return

    let result = await this.unbanInDatabase(this.sector, banId)
    if (!result) return

    delete this.ipBlacklist[result.ip]

    let actor = [banner.name, banner.getRemoteAddress()].join("-")
    LOG.info("[" + this.game.getSectorUid() + "] " + actor  + " [unbanned] " + result.username)
  }

  async banInDatabase(member) {
    let isOfflineMember = typeof member.getRemoteAddress !== 'function'
    let attrs

    if (isOfflineMember) {
      attrs = {
        sectorUid: this.sector.getUid(),
        username: member.name,
        userUid: member.uid
      }
    } else {
      attrs = {
        ip: member.getRemoteAddress(),
        sectorUid: this.sector.getUid()
      }

      if (member.isLoggedIn()) {
        attrs.username = member.name
        attrs.userUid  = member.uid
      }
    }


    await SectorBanModel.createOne(attrs)
    this.sector.fetchSectorBans()
  }

  async unbanInDatabase(sector, banId) {
    let sectorBan = await SectorBanModel.findOne({
      where: {
        sectorUid: sector.getUid(),
        id: banId
      }
    })

    if (sectorBan) {
      let ip = sectorBan.ip
      let username = sectorBan.username
      await sectorBan.destroy()
      sector.fetchSectorBans()
      return { ip: ip, username: username }
    }

    return false
  }

  setRole(memberId, roleType, user) {
    if (this.game.isPvP()) {
      // disallow guest role
      if (roleType === Team.GuestRoleType) {
        return
      }
    }

    let offlineMember = this.offlineMembers[memberId]
    let onlineMember = this.members[memberId]

    if (offlineMember) {
      if (offlineMember.uid === this.creatorUid) return
      if (offlineMember.roleType === Team.AdminRoleType && !user.isSectorOwner()) return

      let playerData = this.game.playerDataMap[offlineMember.uid]
      if (!playerData) return

      if (roleType === Team.GuestRoleType) {
        playerData.remove()
      } else {
        playerData.data.roleType = roleType
      }

      this.onMemberChanged()
    } else if (onlineMember) {
      if (onlineMember.uid === this.creatorUid && !user.isSectorOwner()) return
      if (onlineMember.isAdmin() && !user.isSectorOwner()) return
      if (this.isSectorOwner() &&
          roleType === Team.AdminRoleType &&
          !user.isSectorOwner()) {
        user.showError("Permission Denied", { isWarning: true })
        return
      }

      onlineMember.setRoleType(roleType)
      this.onMemberChanged()
    }
  }

  isSectorOwner() {
    return this.creatorUid === this.game.creatorUid
  }

  isBanned(ip, uid) {
    if (!uid && this.isOnIpBlacklist(ip)) return true
    if (uid && this.isOnUidBlacklist(uid)) return true

    let isBannedInDb = this.sector.sectorBans.find((sectorBan) => {
      if (uid) {
        return sectorBan.userUid === uid
      } else {
        return sectorBan.ip === ip
      }
    })

    if (isBannedInDb) return true

    return false
  }

  isOnIpBlacklist(ip) {
    return this.ipBlacklist[ip]
  }

  isOnUidBlacklist(uid) {
    return this.uidBlacklist[uid]
  }

  addIpBlacklist(ip) {
  }

  removeIpBlacklist(ip) {
    delete this.ipBlacklist[ip]
  }

  removeUidBlacklist(uid) {
    delete this.uidBlacklist[uid]
  }

  cleanupIpBlacklist(timestamp) {
    for (let ip in this.ipBlacklist) {
      let blacklist = this.ipBlacklist[ip]
      let duration = timestamp - blacklist.timestamp
      let oneMinute = Constants.physicsTimeStep * 60 * 1
      let threshold = oneMinute
      if (duration >= threshold) {
        this.removeIpBlacklist(ip)
      }
    }
  }

  cleanupUidBlacklist(timestamp) {
    for (let uid in this.uidBlacklist) {
      let blacklist = this.uidBlacklist[uid]
      let duration = timestamp - blacklist.timestamp
      let oneMinute = Constants.physicsTimeStep * 60 * 1
      let threshold = oneMinute
      if (duration >= threshold) {
        this.removeUidBlacklist(uid)
      }
    }
  }

  getTeam() {
    return this
  }

  getTeamData() {
    return {
      id: this.getId(),
      env: this.game.getEnvironment(),
      region: this.game.getRegion(),
      ip: this.game.server.getHost(),
      host: this.game.server.getHost(),
      name: this.getName(),
      creatorName: this.getCreatorName(),
      creatorUid: this.creatorUid,
      members: this.getMemberNamesJson(),
      isPrivate: this.isPrivate,
      sectorId: this.game.sectorUid,
      daysAlive: this.dayCount,
      gameMode: this.game.getGameMode(),
      playerCount: this.getMemberCount()
    }
  }

  getCreatorName() {
    return this.creatorName
  }

  getMemberNamesJson() {
    return Object.values(this.members).map((member) => {
      return member.getName()
    })
  }

  getName() {
    return this.name
  }

  onTeamCreated() {
    this.game.addTeam(this)

    if (this.isJoinable()) {
      this.game.addColony(this)
    }

    this.onTeamChanged()
  }

  addMemberWithRole(player) {
    if (player.isRemoved) return
    player.setRoleType(Team.MemberRoleType)
    this.addMember(player)
  }

  addMember(player) {
    if (player.isRemoved) return
    this.members[player.getId()] = player
    player.setTeam(this)

    // LOG.info(`${this.name} - ${this.id} add member ${player.name}. getTotalMemberCount: ${this.getTotalMemberCount()}`)

    this.attemptAssignLeader(player)

    this.onMemberAdded(player)
    this.onMemberChanged()
  }

  attemptAssignLeader(player) {
    if (player.getUid() === this.leaderUid) {
      this.setLeader(player)
    }

    if (!this.leaderUid) {
      this.setLeader(player)
    }
  }

  isTeamGameOwner() {
    return (this.game.creatorUid === this.creatorUid) ||
           (this.game.creatorUid === this.leaderUid)
  }

  isRaidable() {
    if (this.getRelationshipStatus() !== "Hostile") return false
    return this.getMemberCount() > 0 && this.getNumHoursAlive() > 8
  }

  hasRecentSpiderInfestation() {
    if (!this.lastSpiderInfestation) return false

    let timestampDuration = this.game.timestamp - this.lastSpiderInfestation

    const secondsPerHour = Constants.secondsPerHour
    const ticksPerSecond = Constants.physicsTimeStep
    const hoursPerDay = 24
    const numDays = 3

    let threeDayTickDuration = ticksPerSecond * secondsPerHour * hoursPerDay * numDays

    return timestampDuration < threeDayTickDuration
  }

  markSpiderInfestationOccured() {
    this.lastSpiderInfestation = this.game.timestamp
  }

  isActive() {
    return this.getMemberCount() > 0
  }

  hasAdminOnline() {
    let result = false

    for (let memberId in this.members) {
      let member = this.members[memberId]
      if (member.getUid() === this.creatorUid) {
        result = true
        break
      }

      if (member.isAdmin()) {
        result = true
        break
      }
    }

    return result
  }

  isCreatorOnline() {
    let result = false

    for (let memberId in this.members) {
      let member = this.members[memberId]
      if (member.getUid() === this.creatorUid) {
        result = true
        break
      }
    }

    return result
  }

  addOfflineMember(data) {
    this.offlineMembers[data.id] = data
  }

  getOfflineMemberCount() {
    return Object.keys(this.offlineMembers).length
  }

  removeOfflineMember(data) {
    delete this.offlineMembers[data.id]
    this.onMemberChanged()
  }

  hasPlayer(player) {
    return this.members[player.getId()] || this.offlineMembers[player.getId()]
  }

  removeMember(player) {
    delete this.members[player.getId()]
    this.addChangedMapPosition(player, { isRemoved: true })

    // LOG.info(`${this.name} - ${this.id} remove member ${player.name}. getTotalMemberCount: ${this.getTotalMemberCount()}`)

    if (this.leader === player) {
      if (!this.hasPlayer(player) && this.game.isPvP()) {
        this.chooseNewRandomleader()
      }
    }

    this.onMemberChanged()
    this.onMemberRemoved(player)
  }

  chooseNewRandomleader() {
    let admin = this.getAdmins()[0]
    if (admin) {
      this.setLeader(admin)
      return
    }

    let member = this.getMembers()[0]
    if (member) {
      this.setLeader(member)
    }
  }

  isTameLimitReached(increment = 0) {
    return (this.getTameCount() + increment) > this.getTameLimit()
  }

  isSlaveLimitReached(increment = 0) {
    return (this.getSlaveCount() + increment) > this.getSlaveLimit()
  }

  getTameCount() {
    return Object.keys(this.getOwnerships("tames")).length
  }

  getSlaveCount() {
    return Object.keys(this.getOwnerships("slaves")).length
  }

  getTameLimit() {
    if (this.sector.isLobby()) return 1
    return debugMode ? 2 : 10
  }

  isLeader(member) {
    return member.uid === this.leaderUid
  }

  getSlaveLimit() {
    if (this.game.isPvP()) return 3
    return debugMode ? 5 : 10
  }

  isBotLimitReached(increment = 0) {
    return (this.getBotCount() + increment) > this.getBotLimit()
  }

  getBotCount() {
    return Object.keys(this.getOwnerships("bots")).length
  }

  getBotLimit() {
    return debugMode ? 2 : 10
  }

  onMemberAdded(player) {
    this.game.triggerEvent("TeamMemberAdded", {
      teamId: this.id,
      team: this.name,
      playerId: player.id,
      player: player.getName(),
      count: this.getMemberCount()
    })
  }

  onMemberRemoved(player) {
    this.game.triggerEvent("TeamMemberRemoved", {
      teamId: this.id,
      team: this.name,
      playerId: player.id,
      player: player.getName(),
      count: this.getMemberCount()
    })

    let tames = this.getOwnerships('tames')
    for (let entityId in tames) {
      let tame = tames[entityId]
      if (tame.isMob() && tame.isMaster(player)) {
        tame.setMaster(null)
      }
    }
  }

  getTotalMemberCount() {
    return this.getOfflineMemberCount() + this.getMemberCount()
  }

  onMemberChanged() {
    if (this.getTotalMemberCount() === 0) {
      let data = { clientMustDelete: true }
      this.onTeamChanged(data)

      if (this.game.isPvP()) {
        this.remove()
      }
    } else if (this.getMemberCount() === 0) {
      let data = { clientMustDelete: true }
      this.onTeamChanged(data)
    } else {
      this.onTeamChanged()
    }
  }

  broadcastPlayerHealth(player) {
    let socketIds = this.getMemberSocketIds()
    this.getSocketUtil().broadcast(socketIds, "UpdateTeamHealth", { entityId: player.id, health: player.health })
  }

  broadcast(eventName, data) {
    let socketIds = this.getMemberSocketIds()
    this.getSocketUtil().broadcast(socketIds, eventName, data)
  }

  getAlliance() {
    return this
  }

  increaseScore(amount) {
    this.score = this.score + amount
  }

  getRankingJson() {
    let score = this.score
    if (score < 0) score = 0

    return {
      id: this.id,
      name: this.name,
      score: score
    }
  }

  canBeRemoved() {
    return !this.isSectorOwner()
  }

  remove() {
    if (!this.canBeRemoved()) return

    super.remove()

    // ensure members deleted and trigger events
    let members = this.getMembers()
    members.forEach((member) => {
      this.removeMember(member)
    })

    this.removeTamesAndBots()
    this.removeOwnerships()

    this.clearChangedMapPositions()

    EventBus.dispatch(this.game.getId() + ":team:removed", this)
    this.game.removeTeam(this)

    if (this.isJoinable()) {
      this.game.removeColony(this)
    }

    this.sector.removeActivityLogEntries(this.id)
    this.sector.setTeamScoreboardChanged()
  }

  removeTamesAndBots() {
    for (let id in this.ownerships['tames']) {
      let entity = this.ownerships['tames'][id]
      entity.remove()
    }

    for (let id in this.ownerships['slaves']) {
      let entity = this.ownerships['slaves'][id]
      entity.remove()
    }

    for (let id in this.ownerships['bots']) {
      let entity = this.ownerships['bots'][id]
      entity.remove()
    }

    delete this.ownerships['tames']
    delete this.ownerships['slaves']
    delete this.ownerships['bots']
  }

  forEachMember(cb) {
    for (let memberId in this.members) {
      let member = this.members[memberId]
      cb(member)
    }
  }

  getPlayerCount() {
    return this.getMemberCount()
  }

  getMemberCount() {
    return Object.keys(this.members).length
  }

  getNumDaysAlive() {
    return this.dayCount
  }

  getRequiredTaxAmount() {
    let paymentAmount = 100 * Math.ceil(this.dayCount / 3)
    paymentAmount = Math.max(0, paymentAmount)
    paymentAmount = Math.min(5000, paymentAmount)
    return paymentAmount
  }

  getNumHoursAlive() {
    let hoursAliveList = Object.values(this.members).map((player) => {
      return player.getNumHoursAlive()
    })

    return Math.max.apply(null, hoursAliveList)
  }

  getRaidableOwnedStructures() {
    if (!this.isJoinable()) {
      if (!this.leader) return []
      return this.leader.getRaidableOwnedStructures()
    } else {
      return this.getOwnedStructures().filter((building) => {
        return !building.sector.isLobby() &&
               !building.hasCategory("door") &&
               !building.hasCategory("rail")
      })
    }
  }

  sendTeamResidents(player) {
    let residents = {}

    for (let id in this.ownerships["slaves"]) {
      residents[id] = this.ownerships["slaves"][id]
    }

    for (let id in this.ownerships["tames"]) {
      residents[id] = this.ownerships["tames"][id]
    }

    for (let id in this.ownerships["bots"]) {
      residents[id] = this.ownerships["bots"][id]
    }

    this.getSocketUtil().emit(player.getSocket(), "TeamResidentsUpdated", { residents: residents })
  }

  getOwnershipCount(typeName) {
    if (!this.ownershipCounts[typeName]) return 0

    return this.ownershipCounts[typeName]
  }

  isBuildLimitReached(buildingKlass, increment = 0) {
    let typeName = buildingKlass.prototype.getTypeName()
    return (this.getOwnershipCount(typeName) + increment) > this.sector.getBuildLimit(typeName)

    return false
  }

  updateScore(entity, options = {}) {
    if (options.removed) {
      this.score -= entity.getCost()
    } else {
      this.score += entity.getCost()
    }

    this.sector.setTeamScoreboardChanged()
  }

  incrementOwnershipCount(entity) {
    this.ownershipCounts[entity.getTypeName()] = this.ownershipCounts[entity.getTypeName()] || 0
    this.ownershipCounts[entity.getTypeName()] += 1
  }

  decrementOwnershipCount(entity) {
    this.ownershipCounts[entity.getTypeName()] = this.ownershipCounts[entity.getTypeName()] || 0
    this.ownershipCounts[entity.getTypeName()] -= 1
  }

}

Object.assign(Team.prototype, Owner.prototype, {
  onOwnershipChanged(entity, options = {}) {
    this.updateScore(entity, options)

    if (options.removed) {
      this.decrementOwnershipCount(entity)
    } else {
      this.incrementOwnershipCount(entity)
    }

    if (this.isBuildLimitReached(entity.constructor)) {
      entity.remove()
    }
  }
})

Team.GuestRoleType = 0
Team.MemberRoleType = 1
Team.AdminRoleType = 2
Team.SlaveRoleType = 3


module.exports = Team
