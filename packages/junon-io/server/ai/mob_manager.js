const Constants = require('../../common/constants.json')
const Grid = require('../../common/entities/grid')
const Mobs = require("./../entities/mobs/index")
const Terrains = require("./../entities/terrains/index")

class MobManager {
  constructor(sector) {
    this.sector = sector
    this.game = this.sector.game

    this.nightMobs = {}

    // limit number of times its spawned
    this.dailySpawnCountByTeam = {}
    this.spawnCountByArea = {}
    this.nightSpawnCountByArea = {}
  }

  onHourChanged() {
    this.hourlySpawn()  
  }

  executeTurn() {
    if (!this.sector.shouldMobsAutospawn()) return

    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0 
    if (!isFiveSecondInterval) return

    this.sector.forEachNonPlayerMobs((mob) => {
      this.despawnMob(mob)
    })
  }

  getPlayers() {
    return this.sector.players
  }

  findMobsInArea(boundingBox) {
    return this.sector.mobTree.search(boundingBox)
  }

  findPlayersInArea(boundingBox) {
    return this.sector.playerTree.search(boundingBox)
  }

  getXYFromRowCol(row, col) {
    return {
      x: col * Constants.tileSize + Constants.tileSize/2,
      y: row * Constants.tileSize + Constants.tileSize/2
    } 
  }

  findSpawnPos(player, condition) {
    let maxSearchCount = 100
    let iteration = 0
    let result 

    while (iteration < maxSearchCount) {
      iteration += 1
      let hit = this.sector.groundMap.randomTile(player.getMobSpawnBoundingBox(), player.getSafeSpawnBoundingBox())
      let isOutOfBounds = this.sector.groundMap.isOutOfBounds(hit.row, hit.col)
      let isInHomeArea = this.sector.homeArea.isInHomeArea(hit.row, hit.col)
      if (!isOutOfBounds && !isInHomeArea) {
        if (condition(hit)) {
          result = hit
          break
        }
      }
    }

    return result
  }

  getQuadrantForRowCol(row, col) {
    let quadrantRowCount = Constants.chunkRowCount * 4

    let quadrantRow = Math.floor(row / quadrantRowCount)
    let quadrantCol = Math.floor(col / quadrantRowCount)

    return { row: quadrantRow, col: quadrantCol }
  }

  getQuadrantForEntity(entity) {
    let row = entity.getRow()  
    let col = entity.getCol()  

    return this.getQuadrantForRowCol(row, col)
  }

  spawnLandMob(player, mobTypeName) {
    this.spawnAreaMob(player, mobTypeName, (hit) => {
      return hit.entity && hit.entity.isGroundTile()
    })
  }

  spawnSkyMob(player, mobTypeName) {
    this.spawnAreaMob(player, mobTypeName, (hit) => {
      let platformTile = this.sector.platformMap.get(hit.row, hit.col)
      return !hit.entity && !platformTile
    })
  }

  linkMob(mob) {
    if (mob.isNightMob() && !mob.hasOwner()) {
      this.nightMobs[mob.getId()] = mob
    }

    let quadrant = this.getQuadrantForEntity(mob)
    let mobTypeName = mob.getTypeName()
    this.increaseSpawnCountByArea(quadrant, mobTypeName, mob.isNightMob())
  }

  spawnAreaMob(player, mobTypeName, condition) {
    let spawnPos = this.findSpawnPos(player, condition)
    if (!spawnPos) return

    let quadrant = this.getQuadrantForRowCol(spawnPos.row, spawnPos.col)
    if (this.hasReachedAreaSpawnLimit(quadrant, mobTypeName)) {
      return
    }

    if (this.hasReachedAreaMobLimit(quadrant, mobTypeName)) {
      return
    }

    let point = this.getXYFromRowCol(spawnPos.row, spawnPos.col)
      
    let mob = this.sector.spawnMob({ x: point.x, y: point.y, type: mobTypeName })[0]
  }

  removeFromNightMobs(mob) {
    delete this.nightMobs[mob.getId()]
  }

  hourlySpawn() {
    if (!this.sector.shouldMobsAutospawn()) return

    // team based spawn
    this.game.forEachTeam((team) => {
      if (this.game.isNight) {
        this.spawnBroods(team)
      }
    })

    // player+area based spawn
    this.sector.forEachPlayer((player) => {
      if (this.game.isNight) {
        this.spawnSkyMob(player, "BioRaptor")
      }

      this.spawnLandMob(player, "Slime")
      this.spawnLandMob(player, "Golem")
      this.spawnLandMob(player, "Mantis")
    })


    // despawn night mobs
    if (!this.game.isNight) {
      this.despawnNightMobs()
    }
  }

  onDayNightChanged(isNight) {
    if (isNight) {
      this.clearSpawnCount()  
      this.spawnBosses()
    }
  }

  spawnBosses() {
    if (this.game.isSurvivalOrHardcore()) {
      if (this.sector.getDayCount() > 0 && this.sector.getDayCount() % 10 === 0) {
        this.game.forEachTeam((team) => {
          this.sector.game.eventManager.createRaid(team, { boss: "Raven" })
        })
      } else if (this.sector.getDayCount() > 0 && this.sector.getDayCount() % 15 === 0) {
        this.game.forEachTeam((team) => {
          this.sector.game.eventManager.createRaid(team, { boss: "SquidLord" })
        })
      }
    }
  }

  // dont care about homearea
  hourlySpawnNightCreatures() {
    let count = 0

    return count
  }

  spawnBroods(team) {
    let miasmaHourThreshold = 10
    let mobTypeName = "Brood"

    let corpsesWithMiasma = Object.values(this.sector.corpses).filter((corpse) => {
      return corpse.isHuman() && corpse.getDecayInHours() >= miasmaHourThreshold
    })

    for (var i = 0; i < corpsesWithMiasma.length; i++) {
      let corpse = corpsesWithMiasma[i]
      let platform = corpse.getStandingPlatform()
      if (platform) {
        let land = platform.getLand()
        if (land && land.isInitialized() && !this.hasReachedTeamSpawnLimit(team, mobTypeName)) {
          let mob = this.sector.spawnMob({ x: platform.getX(), y: platform.getY(), type: mobTypeName })[0]
          if (mob) {
            mob.setAttraction(corpse)
            this.increaseSpawnCountByTeam(team, mobTypeName)
          }
        }
      }
    }

  }

  initSpawnCountByTeam(team, mobTypeName) {
    this.dailySpawnCountByTeam[team.id] = this.dailySpawnCountByTeam[team.id] || {}
    this.dailySpawnCountByTeam[team.id][mobTypeName] = this.dailySpawnCountByTeam[team.id][mobTypeName] || 0
  }

  initSpawnCountByArea(quadrant, mobTypeName) {
    let key = [quadrant.row, quadrant.col].join(",")

    this.spawnCountByArea[key] = this.spawnCountByArea[key] || {}
    this.spawnCountByArea[key][mobTypeName] = this.spawnCountByArea[key][mobTypeName] || 0

    this.nightSpawnCountByArea[key] = this.nightSpawnCountByArea[key] || {}
    this.nightSpawnCountByArea[key][mobTypeName] = this.nightSpawnCountByArea[key][mobTypeName] || 0
  }

  increaseSpawnCountByTeam(team, mobTypeName) {
    this.initSpawnCountByTeam(team, mobTypeName)
    this.dailySpawnCountByTeam[team.id][mobTypeName] += 1
  }

  hasReachedTeamSpawnLimit(team, mobTypeName) {
    this.initSpawnCountByTeam(team, mobTypeName)
    return this.dailySpawnCountByTeam[team.id][mobTypeName] > this.getMobSpawnLimitByTeam(mobTypeName)
  }

  increaseSpawnCountByArea(quadrant, mobTypeName, isNightMob) {
    let key = [quadrant.row, quadrant.col].join(",")

    this.initSpawnCountByArea(quadrant, mobTypeName)

    if (isNightMob) {
      this.nightSpawnCountByArea[key][mobTypeName] += 1
    } else {
      this.spawnCountByArea[key][mobTypeName] += 1
    }
    
  }

  hasReachedAreaSpawnLimit(quadrant, mobTypeName) {
    let key = [quadrant.row, quadrant.col].join(",")

    this.initSpawnCountByArea(quadrant, mobTypeName)
    let regularMobSpawnLimitReached = this.spawnCountByArea[key][mobTypeName] >= this.getMobSpawnLimitByArea(mobTypeName)
    let nightMobSpawnLimitReached = this.nightSpawnCountByArea[key][mobTypeName] >= this.getMobSpawnLimitByArea(mobTypeName)

    return regularMobSpawnLimitReached || nightMobSpawnLimitReached
  }

  getQuadrantBoundingBox(quadrant) {
    let quadrantRowCount = Constants.chunkRowCount * 4
    let quadrantWidth = quadrantRowCount * Constants.tileSize

    let topLeftX = quadrant.col * quadrantRowCount * Constants.tileSize
    let topLeftY = quadrant.row * quadrantRowCount * Constants.tileSize

    return {
      minX: topLeftX,
      minY: topLeftY,
      maxX: topLeftX + quadrantWidth,
      maxY: topLeftY + quadrantWidth
    }
  }

  hasReachedAreaMobLimit(quadrant, mobTypeName) {
    let boundingBox = this.getQuadrantBoundingBox(quadrant)
    let mobTypeCount = this.findMobsInArea(boundingBox).filter((mob) => {
      return mob.getTypeName() === mobTypeName
    }).length

    return mobTypeCount >= this.getMobLimitByArea(mobTypeName)
  }

  clearSpawnCount() {
    this.dailySpawnCountByTeam = {}
    this.nightSpawnCountByArea = {}

    if (this.sector.getDayCount() % 3 === 0) {
      // every 3 days reset spawn count
      this.spawnCountByArea = {}
    }
  }

  getMobSpawnLimitByTeam(mobTypeName) {
    let limit = 1

    switch (mobTypeName) {
      case "Brood": 
        limit = 2
        break
      default:
    }
    
    return limit
  }

  getMobSpawnLimitByArea(mobTypeName) {
    let limit = 1

    switch (mobTypeName) {
      case "BioRaptor": 
        limit = 3
        break
      case "Slime": 
        limit = 2
        break
      case "Golem": 
        limit = 1
        break
      case "Mantis": 
        limit = 1
        break
      default:
    }
    
    return limit
  }

  getMobLimitByArea(mobTypeName) {
    let limit = 1

    switch (mobTypeName) {
      case "BioRaptor": 
        limit = 3
        break
      case "Slime": 
        limit = 2
        break
      case "Golem": 
        limit = 1
        break
      case "Mantis": 
        limit = 1
        break
      default:
    }
    
    return limit
  }

  getDefaultMobNeutralState() {
    let isNeutral = !this.sector.game.isNight
    return isNeutral
  }

  despawnMob(mob) {
    if (mob.isRaidMember()) return
      
    let players = this.findPlayersInArea(mob.getDespawnBoundingBox())
    if (players.length === 0) {
      mob.reduceActivity()
    } else {
      mob.touchActivity()
    }

    if (mob.isNotActive() && !mob.hasOwner()) {
      mob.remove()  
    }
  }

  despawnNightMobs() {
    if (Object.keys(this.nightMobs).length === 0) return

    for (let id in this.nightMobs) {
      let mob = this.nightMobs[id]
      mob.remove() 
    }

    this.nightMobs = {}
  }


}

module.exports = MobManager