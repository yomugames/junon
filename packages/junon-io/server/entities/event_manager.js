const Mobs = require("./mobs/index")
const Protocol = require('../../common/util/protocol')
const Constants = require('../../common/constants.json')
const Raid = require("./raid")
const ExceptionReporter = require('junon-common/exception_reporter')
const Projectiles = require('./projectiles/index')

class EventManager {
  constructor(game) {
    this.game = game
    this.eventsByTeam = {}
    this.pendingRaids = {}
    this.pendingMeteors = {}
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  onHourChanged(hour) {
    if (this.game.isTutorial) {
      this.onHourChangedForTutorial(hour)
    } else {
      this.onHourChangedForSector(hour)
    }
  }

  onHourChangedForTutorial(hour) {

  }

  onWorldStep() {
    this.triggerPendingRaids()
    this.triggerPendingMeteors()
  }

  onHourChangedForSector(hour) {
    if (hour === 15) {
      this.createTaxCollectorEvent()
    }

    if (hour === 22) {
      this.createRaidEvent()
    }

    this.endLongRaids()

    if (hour === 4) {
      this.createSpiderInfestationEvent()
    }

  }

  onDayNightChanged(dayCount) {
    let dayInterval = this.game.isPvP() ? 60 : 6
    if (dayCount % dayInterval === 0) {
      this.createMeteorShowerEvent()
    }
  }

  endLongRaids() {
    this.forEachRaid((raid) => {
      if (raid.isRaidTooLong()) {
        raid.endRaid()
      }
    })
  }

  shouldAllowEvents() {
    if (this.game.isCreatedByAnonynmous()) return true

    // if game is owned by signed-in user,
    // allow raids only if owner/creator is online
    let creatorTeam = this.game.getCreatorTeam()
    if (!creatorTeam) return false

    return creatorTeam.hasAdminOnline()
  }

  createSpiderInfestationEvent() {
    if (!this.shouldAllowEvents()) return
    if (this.game.sector.getDayCount() <= 3) return
    if (this.game.isPeaceful()) return

    this.game.forEachTeam((team) => {
      if (this.shouldSpawnSpiders(team)) {
        this.createSpiderInfestation(team)
      }
    })
  }

  createMeteorShowerEvent() {
    if (!this.shouldAllowEvents()) return
    if (this.game.isPeaceful()) return

    this.game.forEachTeam((team) => {
      if (this.shouldSpawnMeteorShower(team)) {
        this.scheduleMeteorShower(team)
      }
    })
  }

  shouldSpawnSpiders(team, room) {
    if (team.hasRecentSpiderInfestation()) return false
    if (team.getMiningDrillCount() <= 6) return false
    if (this.game.isPeaceful()) return

    let chance = 0.30

    return Math.random() < chance
  }

  shouldSpawnMeteorShower(team) {
    let chance = 0.50

    return Math.random() < chance
  }

  createRaidEvent() {
    if (!this.shouldAllowEvents()) return
    if (this.game.isPvP()) return
    if (this.game.isPeaceful()) return

    if (this.game.isHardcore()) {
      this.game.forEachTeam((team) => {
        this.createRaid(team)
      })
      return
    }

    this.game.forEachTeam((team) => {
      if (team.isRaidable()) {
        if (team.getNumDaysAlive() < 4) {
          this.createRaid(team)
        } else if (this.game.sector.getDayCount() % 3 === 1) {
          // every 3 days
          this.createRaid(team)
        }
      }
    })
  }

  getRaid() {
    return Raid
  }

  createTraderFor(team, tradingTable) {
    let isTraderPresentOnTeam = this.getTeamEvent(team, Constants.Events.TraderArrived)
    if (isTraderPresentOnTeam) return

    let spawnChunkRegion = tradingTable.getChunkRegion()
    if (!spawnChunkRegion) {
      team.broadcast("ErrorMessage", { message: "Unable to find spawn position for Trader. Skipping event." })
      return
    }

    let spawnGround = this.game.sector.pathFinder.findSpawnGround(spawnChunkRegion)
    if (!spawnGround) {
      team.broadcast("ErrorMessage", { message: "Unable to find spawn position for Trader. Skipping event." })
      return
    }

    this.game.sector.spawnMob({
      type: "Trader",
      owner: team,
      goals: [tradingTable],
      x: spawnGround.getX(),
      y: spawnGround.getY()
    })

    team.forEachMember((player) => {
      this.emitEvent(player, "TraderArrived")
    })
  }

  createSlaveTraderFor(team, tradingTable) {
    let isTraderPresentOnTeam = this.getTeamEvent(team, Constants.Events.SlaveTraderArrived)
    if (isTraderPresentOnTeam) return

    let spawnChunkRegion = tradingTable.getChunkRegion()
    if (!spawnChunkRegion) {
      team.broadcast("ErrorMessage", { message: "Unable to find spawn position for SlaveTrader. Skipping event." })
      return
    }

    let spawnGround = this.game.sector.pathFinder.findSpawnGround(spawnChunkRegion)
    if (!spawnGround) {
      team.broadcast("ErrorMessage", { message: "Unable to find spawn position for SlaveTrader. Skipping event." })
      return
    }

    this.game.sector.spawnMob({
      type: "SlaveTrader",
      owner: team,
      goals: [tradingTable],
      x: spawnGround.getX(),
      y: spawnGround.getY()
    })

    team.forEachMember((player) => {
      this.emitEvent(player, "SlaveTraderArrived")
    })
  }

  createTaxCollectorEvent() {
    if (!this.shouldAllowEvents()) return
    if (this.game.isPvP()) return
    if (this.game.isPeaceful()) return
    if (this.game.isHardcore()) return

    this.game.forEachTeam((team) => {
      this.createTaxCollectorFor(team)
    })
  }

  shouldCollectTaxFrom(team) {
    if (team.getRelationshipStatus() === "Hostile") {
      if (team.hasDeed("taxes_not_paid")) {
        if (team.isDeedAlmostExpiring("taxes_not_paid")) {
          return true
        } else {
          return false
        }
      }
    }


    let dayCount = this.game.sector.getDayCount()
    return dayCount % 3 === 1
  }

  getTaxCollectorSpawn(team, playerToReach) {
    let chunkRegion = playerToReach.getChunkRegion()

    let spawnGround = chunkRegion && this.game.sector.pathFinder.findSpawnGround(chunkRegion)
    if (spawnGround) {
      return {
        goalEntity: playerToReach,
        x: spawnGround.getX(),
        y: spawnGround.getY()
      }
    }

    let beacon = team.getRandomBeacon()
    if (beacon && beacon.getStandingPlatform()) {
      let beaconPlatform = beacon.getStandingPlatform()
      let randomPlatform = beaconPlatform.getRoom() && beaconPlatform.getRoom().getRandomUnoccupiedPlatform()
      if (randomPlatform) {
        return {
          goalEntity: randomPlatform,
          x: beacon.getX(),
          y: beacon.getY()
        }
      }
    }

    let room = team.getRandomRoom()
    if (room) {
      let randomPlatform = room.getRandomUnoccupiedPlatform()
      if (randomPlatform) {
        return {
          goalEntity: randomPlatform,
          x: randomPlatform.getX(),
          y: randomPlatform.getY()
        }
      }
    }

    return {
      goalEntity: playerToReach,
      x: playerToReach.getX(),
      y: playerToReach.getY()
    }
  }

  createTaxCollectorFor(team) {
    if (!this.shouldCollectTaxFrom(team)) return

    let isTaxCollectorPresentOnTeam = this.getTeamEvent(team, Constants.Events.TaxCollection)
    if (isTaxCollectorPresentOnTeam) return

    let playerToReach = team.getLeader() || team.getMembers()[0]
    if (!playerToReach) return

    let spawn = this.getTaxCollectorSpawn(team, playerToReach)

    this.game.sector.spawnMob({
      type: "Messenger",
      owner: team,
      goals: [spawn.goalEntity],
      x: spawn.x,
      y: spawn.y
    })

    team.forEachMember((player) => {
      this.emitEvent(player, "TaxCollection")
    })

  }

  forEachRaid(cb) {
    for (let teamId in this.eventsByTeam) {
      let raidEvent = this.getTeamEventById(teamId, Constants.Events.Raid)
      if (raidEvent) {
        cb(raidEvent)
      }
    }
  }

  getTeamEventById(teamId, eventName) {
    this.eventsByTeam[teamId] = this.eventsByTeam[teamId] || {}
    return this.eventsByTeam[teamId][eventName]
  }

  getTeamEvent(team, eventName) {
    this.eventsByTeam[team.getId()] = this.eventsByTeam[team.getId()] || {}
    return this.eventsByTeam[team.getId()][eventName]
  }

  registerTeamEvent(team, eventName, event) {
    this.eventsByTeam[team.getId()] = this.eventsByTeam[team.getId()] || {}
    this.eventsByTeam[team.getId()][eventName] = event
  }

  unregisterTeamEvent(team, eventName) {
    this.eventsByTeam[team.getId()] = this.eventsByTeam[team.getId()] || {}
    delete this.eventsByTeam[team.getId()][eventName]
  }

  shouldCreateRaid(team) {
    return Raid.shouldExistFor(team)
  }

  createRaid(team, options = {}) {
    try {
      if (!this.shouldCreateRaid(team)) return

      if (this.pendingRaids[team.id]) return

      let existingTeamRaid = this.getTeamEvent(team, Constants.Events.Raid)
      if (existingTeamRaid) {
        existingTeamRaid.remove()
      }

      let raid = new Raid(this, { team: team, sector: this.game.sector, boss: options.boss })
      raid.prepare(options)

      if (!raid.hasTarget()) {
        raid.remove()
        return
      }

      this.pendingRaids[team.id] = raid

      team.forEachMember((player) => {
        this.emitEvent(player, "RaidWarning")
      })
    } catch(e) {
      team.game.captureException(e)
    }
  }

  stopRaids() {
    this.pendingRaids = {}

    this.forEachRaid((raid) => {
      raid.endRaid()
    })
  }

  triggerPendingMeteors() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    for (let id in this.pendingMeteors) {
      let meteor = this.pendingMeteors[id]
      if (this.game.timestamp >= meteor.occurTimestamp) {
        let team = meteor.team

        this.createMeteorShowerNear(team, meteor.chunk.row, meteor.chunk.col)

        delete this.pendingMeteors[id]
      }
    }
  }

  async createMeteorShowerNear(team, chunkRow, chunkCol) {
    let promiseA = this.createMeteorShower(team, chunkRow, chunkCol)
    let promiseB = this.createMeteorShower(team, chunkRow + 1, chunkCol)
    let promiseC = this.createMeteorShower(team, chunkRow, chunkCol + 1)
    let promiseD = this.createMeteorShower(team, chunkRow + 1, chunkCol + 1)

    await Promise.all([promiseA, promiseB, promiseC, promiseD])

    this.unregisterMeteor(team)
  }

  async createMeteorShower(team, chunkRow, chunkCol) {
    let chunk = this.game.sector.getChunk(chunkRow, chunkCol)
    if (!chunk) return

    let duration = 5000
    let elapsed = 0

    while (elapsed < duration) {
      let interval = 400 + Math.floor(Math.random() * 300)
      elapsed += interval

      await this.delay(interval)

      this.createMeteor(team, chunk.getRandomRow(), chunk.getRandomCol())
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  createMeteor(team, row, col) {
    let destinationX = col * Constants.tileSize
    let destinationY = row * Constants.tileSize

    let offset = Constants.tileSize * 12
    let angle = Math.PI/4 // 45 degrees

    let sourceX = destinationX + offset * Math.cos(angle)
    let sourceY = destinationY - offset * Math.cos(angle)

    Projectiles.Meteor.build({
      source: { x: sourceX, y: sourceY },
      destination: { x: destinationX, y: destinationY },
      owner: team,
      ignoreObstacles: true
    })
  }

  triggerPendingRaids() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    for (let teamId in this.pendingRaids) {
      let raid = this.pendingRaids[teamId]
      if (this.game.timestamp >= raid.occurTimestamp) {
        raid.start()
        delete this.pendingRaids[teamId]
      }
    }
  }

  getSpiderSpawnCount() {
    let dayCount = this.game.sector.getDayCount()
    if (dayCount < 6) return Math.floor(Math.random() * 2) + 1
    if (dayCount < 12) return Math.floor(Math.random() * 3) + 2

    return Math.floor(Math.random() * 2) + 3
  }


  findMeteorSpawnChunk(team) {
    let rooms = Object.values(team.rooms)

    let targetStructureCount = Math.random() < 0.5 ? 1 : 0

    let largeRooms = rooms.filter((room) => {
      let hasEnoughStructures = room.getStructureCount() >= targetStructureCount
      return room.size > 100 && hasEnoughStructures
    })

    let randomIndex = Math.floor(Math.random() * largeRooms.length)
    let room = largeRooms[randomIndex]
    if (!room) return

    let chunkRegions = room.getChunkRegions()
    let chunkRegionsWithStructures = Object.values(chunkRegions).filter((chunkRegion) => {
      return chunkRegion.getStructureCount() >= targetStructureCount
    })

    randomIndex = Math.floor(Math.random() * chunkRegionsWithStructures.length)
    let chunkRegion = chunkRegionsWithStructures[randomIndex]
    if (!chunkRegion) return

    return chunkRegion.chunk
  }

  scheduleMeteorShower(team, options = {}) {
    if (this.getTeamEvent(team, Constants.Events.MeteorShower)) {
      return
    }

    let chunk

    if (options.row) {
      let chunkRow = Math.floor(options.row / Constants.chunkRowCount)
      let chunkCol = Math.floor(options.col / Constants.chunkColCount)

      chunk = this.game.sector.getChunk(chunkRow, chunkCol)
    } else {
      chunk = this.findMeteorSpawnChunk(team)
      if (!chunk) return
    }

    let id = this.game.generateEntityId()
    let occurTimestamp = this.game.timestamp + (Constants.physicsTimeStep * Constants.secondsPerHour)
    let data = {
      id: id,
      team: team,
      occurTimestamp: occurTimestamp ,
      chunk: chunk
    }

    this.pendingMeteors[id] = data
    this.registerMeteor(data, team)

    this.game.forEachTeam((targetTeam) => {
      targetTeam.forEachMember((player) => {
        this.emitEvent(player, "MeteorShower", { chunkKey: chunk.id })
      })
    })
  }

  createMeteorShowerImmediate(team) {
    if (this.getTeamEvent(team, Constants.Events.MeteorShower)) {
      return
    }

    let chunk = this.findMeteorSpawnChunk(team)
    if (!chunk) return

    let id = this.game.generateEntityId()

    let data = {
      id: id,
      team: team,
      occurTimestamp: this.game.timestamp,
      chunk: chunk
    }

    this.registerMeteor(data, team)

    setTimeout(() => {
      this.createMeteorShowerNear(team, chunk.row, chunk.col)
    }, 5000)

    team.forEachMember((player) => {
      this.emitEvent(player, "MeteorShowerImmediate", { chunkKey: chunk.id })
    })
  }

  getExistingSpiders() {
    let spiders = []

    for (let id in this.game.sector.mobs) {
      let mob = this.game.sector.mobs[id]
      let isSpider = mob.getTypeName() === "Spider" ||
                     mob.getTypeName() === "PoisonSpider"
      if (isSpider && !mob.owner) {
        spiders.push(mob)
      }
    }

    return spiders
  }

  createSpiderInfestation(team, options = {}) {
    try {
      let x, y

      if (options.row) {
        x = options.col * Constants.tileSize
        y = options.row * Constants.tileSize
      } else {
        let room = options.room || team.getAsteroidRoomWithMiningDrill()
        if (!room) return

        let platform = room.getRandomUnoccupiedGround()
        if (!platform) {
          platform = room.getRandomUnoccupiedPlatform()
        }

        if (!platform) return

        x = platform.getX()
        y = platform.getY()
      }

      // remove existing spiders
      let spiders = this.getExistingSpiders()

      spiders.forEach((spider) => {
        spider.remove()
      })

      let count = this.getSpiderSpawnCount(team)
      this.game.sector.spawnMob({ x: x, y: y, type: "PoisonSpider", count: 1 })
      this.game.sector.spawnMob({ x: x, y: y, type: "Spider", count: count })

      team.forEachMember((player) => {
        this.emitEvent(player, "SpiderInfestation")
      })

      team.markSpiderInfestationOccured()
    } catch(e) {
      team.game.captureException(e)
    }
  }

  registerRaid(raid) {
    this.registerTeamEvent(raid.team, Constants.Events.Raid, raid)
  }

  unregisterRaid(raid) {
    this.unregisterTeamEvent(raid.team, Constants.Events.Raid)
  }

  registerMeteor(meteor, team) {
    this.registerTeamEvent(team, Constants.Events.MeteorShower, meteor)
  }

  unregisterMeteor(team) {
    this.unregisterTeamEvent(team, Constants.Events.MeteorShower)
  }

  registerTrader(trader, team) {
    this.registerTeamEvent(team, Constants.Events.TraderArrived, trader)
  }

  unregisterTrader(trader, team) {
    this.unregisterTeamEvent(team, Constants.Events.TraderArrived)
  }

  registerSlaveTrader(trader, team) {
    this.registerTeamEvent(team, Constants.Events.SlaveTraderArrived, trader)
  }

  unregisterSlaveTrader(trader, team) {
    this.unregisterTeamEvent(team, Constants.Events.SlaveTraderArrived)
  }

  registerMessenger(messenger, team) {
    this.registerTeamEvent(team, Constants.Events.TaxCollection, messenger)
  }

  unregisterMessenger(messenger, team) {
    this.unregisterTeamEvent(team, Constants.Events.TaxCollection)
  }

  emitEvent(player, eventName, eventData) {
    let typeId = Protocol.definition().EventType[eventName]
    let data = { type: typeId }
    if (eventData) {
      data.eventData = JSON.stringify(eventData)
    }
    this.getSocketUtil().emit(player.getSocket(), "Event", data)
  }


}

module.exports = EventManager
