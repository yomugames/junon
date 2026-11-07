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
    this.spawnGroundTiles = []
    this.spawnGrounds = []
    this.boss = data.boss

    this.applyData(data)

    if (this.team) {
      this.eventManager.registerRaid(this)
    }

    this.registerEventListeners()
  }


  prepare(options = {}) {
    this.isPreparing = true

    if (options.row !== undefined && options.col !== undefined) {
      let platform = this.sector.getStandingPlatform(options.row, options.col)
      if (platform) {
        this.setSpawnGrounds([platform])
      }
    } else {
      this.setSpawnGrounds(this.determineSpawnGrounds(this.team, this.getDesiredSpawnPointCount()))
    }
  }

  setSpawnGrounds(grounds) {
    this.spawnGroundTiles = grounds
    this.spawnGrounds = grounds.map((ground) => ({
      row: ground.getRow(),
      col: ground.getCol()
    }))
    this.spawnGround = grounds[0]

    if (this.spawnGround) {
      this.spawnGroundRow = this.spawnGround.getRow()
      this.spawnGroundCol = this.spawnGround.getCol()
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

    let savedSpawnGrounds = data.spawnGrounds
    if (!savedSpawnGrounds || savedSpawnGrounds.length === 0) {
      if (data.spawnGroundRow !== undefined && data.spawnGroundCol !== undefined) {
        savedSpawnGrounds = [{ row: data.spawnGroundRow, col: data.spawnGroundCol }]
      } else {
        savedSpawnGrounds = []
      }
    }

    let grounds = savedSpawnGrounds.map((spawnGround) => {
      return this.sector.groundMap.get(spawnGround.row, spawnGround.col) ||
        this.sector.platformMap.get(spawnGround.row, spawnGround.col)
    }).filter(Boolean)
    this.setSpawnGrounds(grounds)

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
    return this.getSortedSpawnRooms(team)[0]
  }

  getSortedSpawnRooms(team) {
    return Object.values(team.rooms).filter((room) => {
      return room.size > 0
    }).sort((room, otherRoom) => {
      return room.getRaidSpawnScore() - otherRoom.getRaidSpawnScore()
    })
  }

  getDesiredSpawnPointCount() {
    let daysAlive = this.team.getNumDaysAlive()
    return Math.max(1, Math.min(4, Math.floor(daysAlive / 15) + 1))
  }

  determineSpawnGrounds(team, desiredCount) {
    let rooms = this.getSortedSpawnRooms(team)
    let grounds = []
    let coordinates = {}
    let emptyPasses = 0

    while (grounds.length < desiredCount && emptyPasses < 3) {
      let previousCount = grounds.length

      for (let i = 0; i < rooms.length && grounds.length < desiredCount; i++) {
        let ground = this.determineSpawnGround(rooms[i])
        if (!ground) continue

        let key = ground.getRow() + "-" + ground.getCol()
        if (!coordinates[key]) {
          coordinates[key] = true
          grounds.push(ground)
        }
      }

      emptyPasses = grounds.length === previousCount ? emptyPasses + 1 : 0
    }

    return grounds
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
    return this.spawnGroundTiles.length > 0
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
    if (this.spawnGroundTiles.length === 0) return

    this.spawnGroundRow = this.spawnGround.getRow()
    this.spawnGroundCol = this.spawnGround.getCol()

    if (this.boss) {
      this.spawnBoss()
    } else {
      this.spawnGuard()
      this.spawnChemist()
      this.spawnDrone()
      this.spawnTrooper()
      this.spawnSapper()
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

    this.spawnMobsAtSpawnPoints("Guard", mobCount, level)
  }

  getMobCountsPerSpawnPoint(mobCount, pointCount = this.spawnGroundTiles.length) {
    if (pointCount === 0) return []

    let baseCount = Math.floor(mobCount / pointCount)
    let remainder = mobCount % pointCount

    return Array.from({ length: pointCount }, (_, index) => {
      return baseCount + (index < remainder ? 1 : 0)
    })
  }

  spawnMobsAtSpawnPoints(type, mobCount, level, spawnPoints = this.spawnGroundTiles) {
    let counts = this.getMobCountsPerSpawnPoint(mobCount, spawnPoints.length)

    spawnPoints.forEach((spawnPoint, index) => {
      if (counts[index] === 0) return

      let x = spawnPoint.getX ? spawnPoint.getX() : spawnPoint.x
      let y = spawnPoint.getY ? spawnPoint.getY() : spawnPoint.y
      this.sector.spawnMob({
        x: x,
        y: y,
        type: type,
        count: counts[index],
        level: level,
        raid: this,
        ignoreLimits: true
      })
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

    this.spawnMobsAtSpawnPoints("Chemist", mobCount, level)
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

  getDesiredMobCountSapper() {
    if(this.sector.getDayCount() < 25) return 0

    if(this.game.isHardcore()) {
      let count = (this.sector.getDayCount() - 18)
      return Math.min(10, count)
    }

    if(this.team.getNumDaysAlive() < 28) {
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

    let mapEdges = [
      { x: Constants.tileSize, y: Constants.tileSize },
      { x: Constants.tileSize, y: (this.sector.getRowCount() - 1) * Constants.tileSize },
      { x: (this.sector.getColCount() - 1) * Constants.tileSize, y: Constants.tileSize },
      { x: (this.sector.getColCount() - 1) * Constants.tileSize, y: (this.sector.getRowCount() - 1) * Constants.tileSize }
    ]
    let spawnPoints = Helper.randomIndexList(mapEdges)
      .slice(0, this.spawnGroundTiles.length)
      .map((index) => mapEdges[index])

    this.spawnMobsAtSpawnPoints("Drone", mobCount, level, spawnPoints)
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

    this.spawnMobsAtSpawnPoints("Trooper", mobCount, level)
  }

  spawnSapper() {
    let mobCount = this.getDesiredMobCountSapper()
    if(mobCount === 0) return

    let level = 0

    if(this.game.isHardcore()) {
      level = Math.floor((this.team.getNumDaysAlive() - 30) / 3)
      level = Math.max(0, level)
      level = Math.min(30, level)
    }

    this.spawnMobsAtSpawnPoints("Sapper", mobCount, level)
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
