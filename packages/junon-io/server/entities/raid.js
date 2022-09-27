const EntityGroup = require("./entity_group")
const Helper = require("../../common/helper")
const Constants = require("../../common/constants.json")
const EventBus = require('eventbusjs')

class Raid {
  constructor(eventManager, data) {
    this.eventManager = eventManager
    this.game = eventManager.game

    this.sector = data.sector

    this.mobGroups = {}
    this.boss = data.boss

    this.applyData(data)

    if (this.team) {
      this.eventManager.registerRaid(this)
    }

    this.registerEventListeners()
  }


  prepare(options = {}) {
    this.isPreparing = true

    if (options.row) {
      let platform = this.sector.getStandingPlatform(options.row, options.col)
      if (platform) {
        this.spawnGround = platform
      }
    } else {
      let room = this.determineSpawnRoom(this.team)
      if (room) {
        this.spawnGround = this.determineSpawnGround(room)
      }
    }
  }

  forEachMobGroups(cb) {
    for (let typeName in this.mobGroups) {
      let mobGroupArray = this.mobGroups[typeName]
      for (var i = 0; i < mobGroupArray.length; i++) {
        let mobGroup = mobGroupArray[i]
        cb(mobGroup)
      }
    }
  }

  registerEventListeners() {
    this.onTeamRemovedListener = this.onTeamRemoved.bind(this)
    this.onEntityRemovedListener = this.onEntityRemoved.bind(this)

    EventBus.addEventListener(this.game.getId() + ":team:removed", this.onTeamRemovedListener)
    EventBus.addEventListener(this.game.getId() + ":entity:removed", this.onEntityRemovedListener)
  }

  registerMobGroupListener(mobGroup) {
    mobGroup.setGoalTargetRemovedListener(this.onRaidGoalTargetRemoved.bind(this))
  }

  unregisterEventListeners() {
    EventBus.removeEventListener(this.game.getId() + ":team:removed", this.onTeamRemovedListener)
    EventBus.removeEventListener(this.game.getId() + ":entity:removed", this.onEntityRemovedListener)

    this.forEachMobGroups((mobGroup) => {
      mobGroup.setGoalTargetRemovedListener(null)
    })
  }

  isRaidTooLong() {
    let twelveHours = Constants.physicsTimeStep * Constants.secondsPerHour * 12
    return (this.game.timestamp - this.occurTimestamp) > twelveHours
  }

  shouldBeAnnounced() {
    if (this.isRaidTooLong()) return false
    if (this.isRaidEnded) return false
    if (this.getMobCount() === 0) return false

    return true
  }

  applyData(data) {
    if (data.id) {
      this.id = data.id
    } else {
      this.id = this.game.generateEntityId()
    }

    this.game.registerEntity(this)

    if (data.team) {
      this.team = this.game.getEntity(data.team.id)
    }

    if (!this.team) return

    if (data.spawnGroundRow) {
      let ground = this.sector.groundMap.get(data.spawnGroundRow, data.spawnGroundCol)
      if (!ground) {
        ground = this.sector.platformMap.get(data.spawnGroundRow, data.spawnGroundCol)
      }

      this.spawnGround = ground
      this.spawnGroundRow = data.spawnGroundRow
      this.spawnGroundCol = data.spawnGroundCol
    }

    if (data.occurTimestamp) {
      this.occurTimestamp = data.occurTimestamp 
    } else {
      this.occurTimestamp = this.game.timestamp + (Constants.physicsTimeStep * Constants.secondsPerHour)
    }
    

    let structures = this.team.getRaidableOwnedStructures()
    this.structureCount = structures.length

    if (structures.length === 0) return
  }

  determineSpawnRoom(team) {
    let roomList = Object.values(team.rooms)
    let roomsSorted = roomList.filter((room) => {
      return room.size > 0
    }).sort((room, otherRoom) => {
      return room.getRaidSpawnScore() - otherRoom.getRaidSpawnScore()
    })

    return roomsSorted[0]
  }

  determineSpawnGround(room) {
    return room.getRaidSpawnTile()
  }

  getMobCount() {
    let count = 0

    this.forEachMobGroups((entityGroup) => {
      count += entityGroup.getChildCount()
    })

    return count
  }

  getId() {
    return this.id
  }

  getTeamId() {
    return this.team.getId()
  }

  onTeamRemoved() {
    this.remove()
  }

  onEntityRemoved() {
    if (this.isPreparing) return
      
    if (this.getMobCount() === 0) {
      this.endRaid()
    }
  }

  hasTarget() {
    return this.spawnGround
  }

  static shouldExistFor(team) {
    let isSelfTeamPartOfJoinableTeam = !team.isJoinable() && team.leader.getJoinableTeam()
    if (isSelfTeamPartOfJoinableTeam) return

    let hasStructures = team.getRaidableOwnedStructures().length > 0

    return hasStructures
  }

  findReachableStructure(reachableStructures) {
    let targetStructure
    let spawnChunkRegion

    const randomIndexList = Helper.randomIndexList(reachableStructures)
    for (var i = 0; i < randomIndexList.length; i++) {
      let index = randomIndexList[i]
      let structure = reachableStructures[index]
      spawnChunkRegion = this.sector.pathFinder.findSpawnChunkRegion(structure)
      if (spawnChunkRegion) {
        if (this.sector.pathFinder.findSpawnGround(spawnChunkRegion)) {
          targetStructure = structure
          break
        }
      }
    }

    return {
      structure: targetStructure,
      spawnChunkRegion: spawnChunkRegion
    }
  }

  getInitialStructureTarget(structures) {
    let reachableStructures = structures.filter((structure) => {
      return structure.getChunkRegion()
    })

    // prioritize structures inside base
    let homeAreaStructures = reachableStructures.filter((structure) => {
      return structure.getChunkRegion().isHomeArea()
    })

    let result = this.findReachableStructure(homeAreaStructures)
    if (result.structure) {
      return result
    }

    // if none matches requirement, target structures outside base
    let nonHomeAreaStructures = reachableStructures.filter((structure) => {
      return !structure.getChunkRegion().isHomeArea()
    })

    result = this.findReachableStructure(nonHomeAreaStructures)
    return result
  }


  start() {
    this.isPreparing = false
    if (!this.spawnGround) return

    this.spawnGroundRow = this.spawnGround.getRow()
    this.spawnGroundCol = this.spawnGround.getCol()

    if (this.boss) {
      this.spawnBoss()
    } else {
      this.spawnGuard()
      this.spawnChemist()
      this.spawnDrone()
      this.spawnTrooper()
    }

    if (this.team) {
      this.team.forEachMember((player) => {
        this.eventManager.emitEvent(player, "Raid")
      })
    }
  }

  spawnBoss() {
    if (this.boss) {
      let mobCount = 1

      let level = 0

      if (this.game.isHardcore()) {
        level = Math.floor((this.team.getNumDaysAlive() - 30) / 3)
        level = Math.max(0, level)
        level = Math.min(30, level)
      }

      let row = Math.random() < 0.5 ? 1 : this.sector.getRowCount() - 1
      let col = Math.random() < 0.5 ? 1 : this.sector.getColCount() - 1

      this.sector.spawnMob({
        x: col * Constants.tileSize,
        y: row * Constants.tileSize,
        type: this.boss,
        level: level,
        count: mobCount,
        raid: this,
        ignoreLimits: true
      })
    }
  }

  spawnGuard() {
    let mobCount = this.getDesiredMobCountGuard(this.team)

    let level = 0

    if (this.game.isHardcore()) {
      level = Math.floor((this.team.getNumDaysAlive() - 20) / 3)
      level = Math.max(0, level)
      level = Math.min(30, level)
    }

    this.sector.spawnMob({
      x: this.spawnGround.getX(),
      y: this.spawnGround.getY(),
      type: "Guard",
      count: mobCount,
      level: level,
      raid: this,
      ignoreLimits: true
    })
  }

  addToMobGroup(entity) {
    let mobGroup = this.findOrCreateMobGroup(entity)
    mobGroup.addChild(entity)
  }

  findOrCreateMobGroup(entity) {
    let mobGroup
    let typeName = entity.getTypeName()

    if (!this.mobGroups[typeName]) {
      mobGroup = new EntityGroup()
      this.mobGroups[typeName] = []
      this.mobGroups[typeName].push(mobGroup)
      this.registerMobGroupListener(mobGroup)
    } 

    mobGroup = this.mobGroups[typeName][this.mobGroups[typeName].length - 1] 
    if (mobGroup.getChildCount() >= 5) {
      mobGroup = new EntityGroup()
      this.mobGroups[typeName].push(mobGroup)
      this.registerMobGroupListener(mobGroup)
    }

    return mobGroup
  }

  spawnChemist() {
    let mobCount = this.getDesiredMobCountChemist()
    if (mobCount === 0) return

    let level = 0

    if (this.game.isHardcore()) {
      level = Math.floor((this.team.getNumDaysAlive() - 20) / 3)
      level = Math.max(0, level)
      level = Math.min(30, level)
    }

    this.sector.spawnMob({
      x: this.spawnGround.getX(),
      y: this.spawnGround.getY(),
      type: "Chemist",
      level: level,
      count: mobCount,
      raid: this,
      ignoreLimits: true
    })
  }

  getDesiredMobCountChemist() {
    if (this.team.getNumDaysAlive() < 5) return 0

    if (this.game.isHardcore()) {
      let count = this.team.getNumDaysAlive() - 5 + 1
      return Math.min(10, count)
    }

    let mobCount
    if (this.team.getNumDaysAlive() < 10) {
      mobCount = 1
    } else if (this.team.getNumDaysAlive() < 16) {
      mobCount = 2
    } else {
      mobCount = Math.floor(Math.random() * 3) + 2
    }

    return mobCount
  }

  getDesiredMobCountDrone() {
    if (this.sector.getDayCount() < 8) return 0

    if (this.game.isHardcore()) {
      let count = (this.sector.getDayCount() - 8) 
      return Math.min(15, count)
    }

    if (this.team.hasDeed("cannibalism") || this.team.hasDeed("extreme_cannibalism")) {
      return 1
    }

    return 0
  }

  getDesiredMobCountTrooper() {
    if (this.sector.getDayCount() < 15) return 0

    if (this.game.isHardcore()) {
      let count = (this.sector.getDayCount() - 12) 
      return Math.min(10, count)
    }

    if (this.team.getNumDaysAlive() < 18) {
      return 1
    }

    return Math.floor(Math.random() * 3) + 2
  }

  spawnDrone() {
    let mobCount = this.getDesiredMobCountDrone()
    if (mobCount === 0) return

    let level = 0

    if (this.game.isHardcore()) {
      level = Math.floor((this.team.getNumDaysAlive() - 30) / 3)
      level = Math.max(0, level)
      level = Math.min(30, level)
    }

    let row = Math.random() < 0.5 ? 1 : this.sector.getRowCount() - 1
    let col = Math.random() < 0.5 ? 1 : this.sector.getColCount() - 1

    this.sector.spawnMob({
      x: col * Constants.tileSize,
      y: row * Constants.tileSize,
      type: "Drone",
      level: level,
      count: mobCount,
      raid: this,
      ignoreLimits: true
    })
  }

  spawnTrooper() {
    let mobCount = this.getDesiredMobCountTrooper()
    if (mobCount === 0) return

    let level = 0

    if (this.game.isHardcore()) {
      level = Math.floor((this.team.getNumDaysAlive() - 30) / 3)
      level = Math.max(0, level)
      level = Math.min(30, level)
    }

    this.sector.spawnMob({
      x: this.spawnGround.getX(),
      y: this.spawnGround.getY(),
      type: "Trooper",
      level: level,
      count: mobCount,
      raid: this,
      ignoreLimits: true
    })
  }

  onRaidGoalTargetRemoved() {
    if (this.game.isHardcore()) return
    if (this.boss) return

    let structureRemainingRatio = this.team.getRaidableOwnedStructures().length / this.structureCount
    if (structureRemainingRatio < 0.5) {
      this.endRaid()
    }
  }

  determineRaidState() {
    if (this.getMobCount() === 0) {
      this.isRaidEnded = true
    }
  }

  endRaid() {
    if (this.isRaidEnded) {
      if (this.isRaidTooLong()) {
        // if i still have mobs alive, remove them immediately
        if (this.getMobCount() > 0) {
          this.forEachMobGroups((mobGroup) => {
            mobGroup.remove()
          })
        }
      }

      return
    }

    this.isRaidEnded = true

    this.forEachMobGroups((mobGroup) => {
      if (this.spawnGround) {
        mobGroup.addGoalTarget(this.spawnGround, { callback: this.onGoalTargetReached.bind(this) })
      } else {
        mobGroup.remove()
      }
    })

    if (this.team) {
      this.team.forEachMember((player) => {
        this.eventManager.emitEvent(player, "RaidEnd")
      })
    }
  }

  remove() {
    if (this.team) {
      this.eventManager.unregisterRaid(this)
    }

    this.unregisterEventListeners()
    this.game.unregisterEntity(this)

    this.forEachMobGroups((mobGroup) => {
      mobGroup.remove()
    })
  }

  onGoalTargetReached(targetEntity) {
    this.forEachMobGroups((mobGroup) => {
      mobGroup.remove()
    })
  }

  determineTeamLevel(team) {
    // player colonist count
    // 1. team player count
  }

  getDesiredMobCountGuard(team) {
    if (this.game.isHardcore()) {
      let daysAlive = team.getNumDaysAlive()
      let maxSize = 40
      return Math.min(maxSize, daysAlive * 2)
    }

    // basic
    let daysAlive = team.getNumDaysAlive()
    if (daysAlive < 3) {
      return Math.max(0, (daysAlive - 1))
    } else if (daysAlive >= 5) { // when chemist start spawning
      // reset. start at 2
      let maxSize = 25
      daysAlive -= 3
      return Math.min(maxSize, daysAlive * 2)
    } else {
      return (daysAlive - 2) * 2
    }
  }

  determineRaiderDifficulty() {

  }

}

module.exports = Raid
