// the steps are done asynchronouly to avoid blocking 
// other games gameloop

const Raid = require("./raid")

class SectorLoader {
  constructor(sector) {
    this.sector = sector
    this.game = sector.game

    this.MAX_DURATION = 100

    this.loadSectorStep = 0
    this.isFinished = false
    this.initLoadSectorSteps()

    this.allocateEntitiesIndex = 0 // for allocateEntitiesStep
    this.placeBuildingsIndex = 0   // for placeBuildingsStep
    this.pendingStores = {}
    this.walls = []

    this.placedBuildings = []

    this.entityAllocationGroups = {
      platforms: [],
      fuelEntities: [],
      powerEntities: [],
      liquidEntities: [],
      oxygenEntities: [],
      railEntities: [],
      soilEntities: []
    }
  }

  initLoadSectorSteps() {
    this.steps = []
    this.steps.push(this.generateMapTerrainStep.bind(this))
    this.steps.push(this.loadTeamPlayersStep.bind(this))
    this.steps.push(this.disableNetworkAllocationStep.bind(this))
    this.steps.push(this.placeBuildingsStep.bind(this))
    this.steps.push(this.insertBuildingTreeStep.bind(this))
    this.steps.push(this.enableNetworkAllocationStep.bind(this))
    this.steps.push(this.allocateRoomsStep.bind(this))
    this.steps.push(this.allocateEntitiesStep.bind(this))
    this.steps.push(this.allocateLandRoomsStep.bind(this))
    this.steps.push(this.placeCorpseStep.bind(this))
    this.steps.push(this.placeMobsStep.bind(this))
    this.steps.push(this.placePickupsStep.bind(this))
    this.steps.push(this.placeTransportsStep.bind(this))
    this.steps.push(this.processPendingStoresStep.bind(this))
  }

  generateMapTerrainStep(metadata, entities) {
    let start = Date.now()

    this.sector.mapGenerator.generateFromSectorData(metadata.rowCount, metadata.colCount, entities)
    this.loadSectorStep += 1

    return Date.now() - start
  }

  loadTeamPlayersStep(metadata, entities) {
    let start = Date.now()

    for (let id in entities.teams) {
      let data = entities.teams[id]
      this.sector.safeCreateTeam(data)
    }

    for (let id in entities.playerDataMap) {
      let playerData = entities.playerDataMap[id]
      this.sector.safeCreatePlayerData(playerData.data)
    }

    for (let id in entities.players) {
      let data = entities.players[id]
      this.sector.safeCreatePlayerData(data)
    }

    this.loadSectorStep += 1
    return Date.now() - start
  }

  disableNetworkAllocationStep() {
    let start = Date.now()

    this.sector.roomManager.setAllocationDisabled(true)
    this.sector.fuelManager.setAllocationDisabled(true)
    this.sector.powerManager.setAllocationDisabled(true)
    this.sector.liquidManager.setAllocationDisabled(true)
    this.sector.oxygenManager.setAllocationDisabled(true)
    this.sector.railManager.setAllocationDisabled(true)
    this.sector.soilManager.setAllocationDisabled(true)

    this.loadSectorStep += 1

    return Date.now() - start
  }

  enableNetworkAllocationStep() {
    let start = Date.now()

    this.sector.roomManager.setAllocationDisabled(false)
    this.sector.fuelManager.setAllocationDisabled(false)
    this.sector.powerManager.setAllocationDisabled(false)
    this.sector.liquidManager.setAllocationDisabled(false)
    this.sector.oxygenManager.setAllocationDisabled(false)
    this.sector.railManager.setAllocationDisabled(false)
    this.sector.soilManager.setAllocationDisabled(false)

    this.loadSectorStep += 1
    return Date.now() - start
  }

  allocateRoomsStep() {
    let start = Date.now()
    this.sector.roomManager.allocateRooms(this.entityAllocationGroups.platforms)
    this.updateWallNeighbors()
    this.loadSectorStep += 1
    return Date.now() - start
  }

  updateWallNeighbors() {
    for (var i = 0; i < this.walls.length; i++) {
      let wall = this.walls[i]
      let neighbors = this.sector.armorMap.getNeighborsAllowEmpty(wall.getRow(), wall.getCol())
      wall.setNeighbors(neighbors)
    }
  }

  allocateEntitiesStep(metadata, entities, elapsed) {
    let localElapsed = 0

    let entityAllocationList = [
      { manager: "fuelManager", entities: "fuelEntities"}, 
      { manager: "powerManager", entities: "powerEntities"}, 
      { manager: "liquidManager", entities: "liquidEntities"}, 
      { manager: "oxygenManager", entities: "oxygenEntities"}, 
      { manager: "railManager", entities: "railEntities"}, 
      { manager: "soilManager", entities: "soilEntities"}, 

    ]

    while (localElapsed + elapsed < this.MAX_DURATION &&
           this.allocateEntitiesIndex < entityAllocationList.length) {
      let start = Date.now()
      let entityAllocation = entityAllocationList[this.allocateEntitiesIndex]
      let networkEntities = this.entityAllocationGroups[entityAllocation.entities]
      let manager = this.sector[entityAllocation.manager]
      manager.allocateEntities(networkEntities)
      this.allocateEntitiesIndex += 1

      localElapsed += (Date.now() - start)
    }

    if (this.allocateEntitiesIndex >= entityAllocationList.length) {
      this.loadSectorStep += 1
    }

    return localElapsed
  }

  applySectorData(metadata, entities) {
    let elapsed = 0

    try {
      while (elapsed < this.MAX_DURATION &&
            this.loadSectorStep < this.steps.length) {
        let loadFunction = this.steps[this.loadSectorStep]
        let duration = loadFunction(metadata, entities, elapsed)
        elapsed += duration
      }

      if (this.loadSectorStep >= this.steps.length) {
        this.onLoadSectorFinished()
        this.isFinished = true
      }
    } catch(e) {
      this.game.captureException(e)
      this.isFinished = true
    }

    return this.isFinished
  }

  placeBuildingsStep(metadata, entities, elapsed) {
    let localElapsed = 0

    this.sector.setBuildingTreeInsertDisable(true)

    while (localElapsed + elapsed < this.MAX_DURATION &&
          this.placeBuildingsIndex < entities.buildings.length) {
      let start = Date.now()

      let data = entities.buildings[this.placeBuildingsIndex]
      let building = this.sector.safePlaceBuilding(data)

      if (building) {
        if (building.hasCategory("platform")) {
          this.entityAllocationGroups.platforms.push(building)
        }

        if (building.isWall()) {
          this.walls.push(building)
        }

        if (building.hasFuelRole()) {
          this.entityAllocationGroups.fuelEntities.push(building)
        }

        if (building.hasPowerRole()) {
          this.entityAllocationGroups.powerEntities.push(building)
        }

        if (building.hasLiquidRole()) {
          this.entityAllocationGroups.liquidEntities.push(building)
        }

        if (building.hasOxygenRole()) {
          this.entityAllocationGroups.oxygenEntities.push(building)
        }

        if (building.hasRailRole()) {
          this.entityAllocationGroups.railEntities.push(building)
        }

        if (building.hasSoilRole()) {
          this.entityAllocationGroups.soilEntities.push(building)
        }
        
        this.placedBuildings.push(building)
      }

      this.placeBuildingsIndex += 1
      
      localElapsed += (Date.now() - start)
    }

    if (this.placeBuildingsIndex >= entities.buildings.length) {
      this.loadSectorStep += 1
    }

    return localElapsed
  }

  insertBuildingTreeStep(metadata, entities) {
    let start = Date.now()

    this.sector.setBuildingTreeInsertDisable(false)
    this.sector.buildingTree.load(this.placedBuildings)
    this.loadSectorStep += 1

    return Date.now() - start
  }

  allocateLandRoomsStep(metadata, entities) {
    let start = Date.now()

    this.sector.landManager.forEachLand((land) => {
      this.sector.roomManager.allocateRoomsForLand(land)
    })

    this.loadSectorStep += 1

    return Date.now() - start
  }


  placeCorpseStep(metadata, entities) {
    let start = Date.now()

    for (let id in entities.corpses) {
      let data = entities.corpses[id]
      this.sector.safeCreateCorpse(data)
    }

    this.loadSectorStep += 1
    return Date.now() - start
  }

  safeExecute(cb) {
    try {
      cb()
    } catch(e) {
      this.game.captureException(e)
    }
  }

  placeMobsStep(metadata, entities) {
    let start = Date.now()
    if (entities.raids) {
      entities.raids.forEach((data) => {
        this.safeExecute(() => {
          data.sector = this.sector
          new Raid(this.game.eventManager, data)
        })
      })
    }

    for (let id in entities.mobs) {
      let data = entities.mobs[id]
      this.sector.safeCreateMob(data)
    }

    this.sector.determineRaidState()
    this.loadSectorStep += 1
    return Date.now() - start
  }

  placePickupsStep(metadata, entities) {
    let start = Date.now()

    for (let id in entities.pickups) {
      let data = entities.pickups[id]
      this.sector.safeCreatePickup(data)
    }

    this.loadSectorStep += 1

    return Date.now() - start
  }

  placeTransportsStep(metadata, entities) {
    let start = Date.now()
    // we want transport to be after player/mob/corpse has been created
    // so their container can be set appropriately
    for (let id in entities.transports) {
      let data = entities.transports[id]
      this.sector.safeCreateTransport(data)
    }

    this.loadSectorStep += 1
    return Date.now() - start
  }

  processPendingStoresStep() {
    let start = Date.now()
    for (let buildingId in this.pendingStores) {
      let pending = this.pendingStores[buildingId]
      let building = this.game.getEntity(buildingId)

      for (let index in pending) {
        let itemData = pending[index]
        let isItem = itemData.hasOwnProperty("count")

        if (isItem) {
          let item = this.sector.createItem(itemData.type, itemData)
          building.storeAt(itemData.index, item)
        } else {
          // mob or corpse
          let entity = this.game.getEntity(itemData.id)
          if (entity && entity.type === itemData.type) {
            building.storeAt(index, entity)
          }
        }
      }
    }

    this.loadSectorStep += 1
    return Date.now() - start
  }

  addPendingStore(buildingId, index, entityData) {
    this.pendingStores[buildingId] = this.pendingStores[buildingId] || {}
    this.pendingStores[buildingId][index] = entityData
  }

  onLoadSectorFinished() {
    this.entityAllocationGroups = {}
    this.walls = {}
    this.pendingStores = {}
    this.sector.onFinishedLoading()
  }

}

module.exports = SectorLoader