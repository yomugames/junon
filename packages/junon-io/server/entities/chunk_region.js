const ChunkGate = require("./chunk_gate")
const Protocol = require('../../common/util/protocol')
const Constants = require('../../common/constants.json')
const Helper = require('../../common/helper')
const BaseMob = require("./mobs/base_mob")

class ChunkRegion {
  constructor(chunk, options = {}) {
    this.id = [chunk.getId(), chunk.game.generateId("chunk_region")].join("-")
    this.chunk = chunk

    this.tiles = {}
    this.groundEdges = {} // for sky chunkRegion, track which tiles are next to ground
    this.skyEdges = {}   // for both land/sky chunkRegion, track which tiles are next to sky
    this.groundSkyEdges = {}
    this.waterEdges = {}
    this.structures = {}
    this.distributions = {}
    this.players = {}
    this.mobs = {}
    this.walls = {}
    this.corpses = {}
    this.wanderTiles = []

    this.dirtLevel = 0
    this.dirtMap = {}
    this.soilNetworks = {}

    this.isSky = options.isSky

    this.isLandSkyConnectedCache = {}
    this.isWallConnectedCache = {}

    this.initGates()
    this.registerToChunk()
  }

  isSkyChunkRegion() {
    return this.isSky
  }

  isLandChunkRegion() {
    return !this.isSky
  }

  hasPlayerStructures() {
    return !Helper.isHashEmpty(this.walls) || !Helper.isHashEmpty(this.structures)
  }

  requestChunkRegionPath() {
    return this.chunk.sector.pathFinder.requestChunkRegionPath(this)
  }

  isAtEdgeOfContinent() {
    let continent = this.getContinent()
    if (!continent) return false
    return continent.hasEdge(this)
  }

  getDistributions() {
    let distributions = [];

    this.forEachDistributionUntil((distribution) => {
      distributions.push(distribution)
    })
    return distributions
  }

  getCrops() {
    let crops = []

    this.forEachSoilNetworkUntil((soilNetwork) => {
      if (soilNetwork.harvestableSet) {
        soilNetwork.harvestableSet.forEach((coord) => {
          const row = coord.split("-")[0]
          const col = coord.split("-")[1]
          let crop = this.getSector().distributionMap.get(row, col)
          crops.push(crop)
        })

        return true
      }
    })

    return crops
  }

  getFoodStorage(owner) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.hasCategory("food_storage") && 
          structure.hasFood() &&
          structure.isSlaveAllowedToAccess()) {
        result = structure
        return result
      }
    })

    return result
  }

  getUnclaimedCorpse() {
    let result

    for (let id in this.corpses) {
      let corpse = this.corpses[id]
      if (!corpse.isClaimed() && corpse.canBeClaimedBySlave()) {
        result = corpse
      }
    }

    return result
  }

  getAmmoStorage(owner, ammoType) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.hasCategory("storage") && 
          structure.hasAmmoType(ammoType) && 
          structure.isSlaveAllowedToAccess()) {
        result = structure
        return result
      }
    })

    return result
  }

  getStorageWithCondition(owner, condition) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.hasCategory("storage") && 
          structure.isSlaveAllowedToAccess() &&
          condition(structure)) {
        result = structure
        return result
      }
    })

    return result
  }

  getBottleStorage(owner) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.hasCategory("storage") && 
          structure.isSlaveAllowedToAccess() &&
          structure.hasBottle()) {
        result = structure
        return result
      }
    })

    return result
  }

  getSeedStorageWithType(owner, type) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.hasCategory("storage") && 
          structure.isSlaveAllowedToAccess() &&
          structure.hasSeed()) {
        let seed = structure.searchByCondition((item) => {
          return item.type === type
        })

        if (seed) {
          result = structure
          return result
        }
      }
    })

    return result
  }

  getStructureWithType(owner, type, options = {}) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) &&
          structure.getType() === type) {
        if (options.isNotClaimed) {
          if (!structure.isClaimed()) {
            result = structure
          } 
        } else {
          result = structure
        }
        
        return result
      }
    })

    return result
  }

  forEachStructureUntil(condition) {
    for (let id in this.structures) {
      let structure = this.structures[id]
      let shouldStop = condition(structure)
      if (shouldStop) {
        break
      }
    }
  }

  forEachSoilNetworkUntil(condition) {
    for (let id in this.soilNetworks) {
      let soilNetwork = this.soilNetworks[id]
      let shouldStop = condition(soilNetwork)
      if (shouldStop) {
        break
      }
    }
  }

  forEachDistributionUntil(condition) {
    for(let id in this.distributions) {
      let distribution = this.distributions[id]
      let shouldStop = condition(distribution)
      if(shouldStop) {
        break;
      }
    }
  }

  getTable(owner) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("dining_table")) {
        result = structure
        return true
      }
    })

    return result
  }

  getBuildingType(owner, buildingType) {
    let result;

    this.forEachStructureUntil((structure) => {
      if(buildingType === structure.type) {
        result = structure;
        return true;
      }
    })
    return result;
  }

  getBarTable(owner) {
    let result;

    this.forEachStructureUntil((structure) => {
      if(Protocol.definition().BuildingType["BarTable"] === structure.type) {
        result = structure;
        return true;
      }
    })
    return result;
  }

  getSuitStation(owner) {
    let result

    this.forEachStructureUntil((structure) => {
      if(Protocol.definition().BuildingType["SuitStation"] === structure.type && !Object.keys(structure.storage).length){
        result = structure
        return true
      }
    })

    return result
  }
  getWaterSource(owner) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("liquid_tank") &&
          structure.getResourceStored('liquid') > 0) {
        result = structure
        return true
      }
    })

    if (result) return result

    let waterEdgeKeys = Object.keys(this.waterEdges)
    if (waterEdgeKeys.length > 0) {
      let row = waterEdgeKeys[0].split("-")[0]
      let col = waterEdgeKeys[0].split("-")[1]  

      result = this.chunk.sector.groundMap.get(row, col)
    }

    return result
  }

  getButcherTable(owner, options = {}) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("butcher_table") &&
          structure.getWorkPosition()) {
        if (options.isNotClaimed) {
          if (!structure.isClaimed()) {
            result = structure
          } 
        } else {
          result = structure
        }
        return result
      }
    })

    return result
  }

  getMiner(owner, options = {}) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("mining_drill") &&
          structure.isStorageFull()) {
        if (options.isNotClaimed) {
          if (!structure.isClaimed()) {
            result = structure
          } 
        } else {
          result = structure
        }
        return result
      }
    })

    return result
  }

  getStove(owner, options = {}) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("stove") &&
          structure.isPowered &&
          structure.getWorkPosition()) {
        if (options.excludeStoveIds) {
          let shouldExclude = options.excludeStoveIds[structure.getId()]
          if (shouldExclude) return false
        }

        if (options.isNotClaimed) {
          if (!structure.isClaimed()) {
            result = structure
          } 
        } else {
          result = structure
        }
        return result
      }
    })

    return result
  }

  getSoilNetwork(owner, condition) {
    let result 

    this.forEachSoilNetworkUntil((soilNetwork) => {
      if (soilNetwork.isOwnedBy(owner) && 
          condition(soilNetwork)) {
        result = soilNetwork
        return true
      }
    })

    return result
  }

  getTurret(owner, condition) {
    let result 

    this.forEachStructureUntil((structure) => {
      if (structure.isOwnedBy(owner) && 
          structure.hasCategory("ammo_turret")) {
        if (condition(structure)) {
          result = structure
          return true
        }
      }
    })

    return result
  }

  getRoomOfStructures() {
    let structures = Object.values(this.structures)  
    let structureWithRoom = structures.find((structure) => {
      return structure.getRoom()
    })

    if (structureWithRoom) {
      return structureWithRoom.getRoom()
    }

    return null
  }

  getWallsOnDifferentContinent() {
    let continent = this.getContinent()

    let neighbors = this.getNeighbors({sameBiome: false, passThroughWall: true })
    let chunkRegions = {} 

    neighbors.forEach((neighbor) => {
      let isDifferentContinent = neighbor.getContinent() !== continent
      if (isDifferentContinent) {
        chunkRegions[neighbor.getId()] = neighbor
      }
    })

    if (chunkRegions.length === 0) return []

    let result = []
    for (let id in this.walls) {
      let wall = this.walls[id]
      let wallChunkRegions = wall.getChunkRegions()
      if (this.hasCommonChunkRegionSet(wallChunkRegions, chunkRegions)) {
        result.push(wall)
      }
    }

    return result
  }

  hasCommonChunkRegionSet(chunkRegions, otherChunkRegions) {
    let result = false

    for (let id in chunkRegions) {
      if (otherChunkRegions[id]) {
        result = true
        break
      }
    }

    return result
  }

  getChunkRowCol() {
    return this.chunk.getId()
  }

  getSector() {
    return this.chunk.sector
  }

  getPlatformTile() {
    let entity = null

    for (let tileKey in this.tiles) {
      let data = this.getRowColFromTileKey(tileKey)
      let tile = this.chunk.sector.pathFinder.getTile(data.row, data.col)
      if (tile && tile.isGround()) {
        entity = tile
        break
      }
    }

    return entity
  }

  isPassable(hit) {
    return this.chunk.sector.pathFinder.isPassable(hit)
  }

  register(group, entity) {
    this[group][entity.id] = entity 
  }

  unregister(group, entity) {
    delete this[group][entity.id] 
  }

  registerToChunk() {
    this.chunk.chunkRegions[this.getId()] = this
  }

  unregisterFromChunk() {
    delete this.chunk.chunkRegions[this.getId()]
  }

  remove() {
    this.structures = {}
    this.walls = {}
    this.tiles = {}
    this.groundEdges = {}
    this.skyEdges = {}
    this.groundSkyEdges = {}
    this.distributions = {}

    this.unregisterFromChunk()

    for (let id in this.soilNetworks) {
      let soilNetwork = this.soilNetworks[id]
      soilNetwork.removeChunkRegion(this)
    }

    let continent = this.getContinent()
    if (continent) continent.remove()
  }

  isLandSkyConnected(chunkRegion) {
    if (this.isLandSkyConnectedCache[chunkRegion.getId()]) {
      return this.isLandSkyConnectedCache[chunkRegion.getId()]
    }

    let otherEdges = chunkRegion.getLandSkyTransitionEdges()
    let edges = this.getLandSkyTransitionEdges()

    let result = false

    for (let edge in edges) {
      for (let otherEdge in otherEdges) {
        if (this.isEdgeBesideEachOther(edge, otherEdge)) {
          result = true
          break
        }
      }
    }

    this.isLandSkyConnectedCache[chunkRegion.getId()] = result

    return result
  }

  isWallConnected(chunkRegion) {
    if (this.isWallConnectedCache[chunkRegion.getId()]) {
      return this.isWallConnectedCache[chunkRegion.getId()]
    }

    let result = false

    for (let wallId in this.walls) {
      let shareSameWall = chunkRegion.walls[wallId]
      if (shareSameWall) {
        result = true
        break
      }
    }

    this.isWallConnectedCache[chunkRegion.getId()] = result

    return result
  }

  isEdgeBesideEachOther(edge, otherEdge) {
    let row = parseInt(edge.split("-")[0])
    let col = parseInt(edge.split("-")[1])

    let otherRow = parseInt(otherEdge.split("-")[0])
    let otherCol = parseInt(otherEdge.split("-")[1])

    let distance = this.chunk.game.distance(row, col, otherRow, otherCol)
    return distance === 1
  }

  getRandomGateCoord() {
    let gates = this.getAllGates()
    let gate = gates[0]
    return gate && gate.start
  }

  getGatesToEnterFrom(chunkRegion) {
    let result = []

    let otherGates = chunkRegion.getAllGates()
    let gates = this.getAllGates()
    otherGates.forEach((otherGate) => {
      gates.forEach((gate) => {
        if (gate.isConnectedTo(otherGate)) {
          result.push(gate)
        }
      })
    })

    return result
  }

  getContinent() {
    return this.getSector().getContinent(this)
  }

  findOrCreateContinent() {
    return this.getSector().findOrCreateContinent(this)
  }

  getAllGates() {
    let result = []
    for (let direction in this.gates) {
      let gatesInDirection = this.gates[direction]
      for (let key in gatesInDirection) {
        let gate = gatesInDirection[key]
        result.push(gate)
      }
    }

    return result
  }

  initGates() {
    this.gates = {}
  }

  getNeighbors(options = {}) {
    let neighbors = {}

    if (typeof options.sameBiome === 'undefined' && !options.all) {
      options.sameBiome = true
    }
    

    for (let direction in this.gates) {
      let neighborChunk = this.getNeighborChunkByDirection(direction)
      if (!neighborChunk) continue

      let gatesInDirection = this.gates[direction]
      for (let key in gatesInDirection) {
        let gate = gatesInDirection[key]
        let neighborChunkRegions = neighborChunk.getChunkRegions()

        for (let id in neighborChunkRegions) {
          let neighborChunkRegion =  neighborChunkRegions[id]

          // ground chunkRegions should only grab ground chunkRegion neighbors
          // same for sky chunkRegions

          let isBiomeSatisfied

          if (options.all) {
            isBiomeSatisfied = true
          } else if (options.sameBiome) {
            isBiomeSatisfied = neighborChunkRegion.isSky === this.isSky
          } else {
            isBiomeSatisfied = neighborChunkRegion.isSky !== this.isSky
          }

          if (isBiomeSatisfied && neighborChunkRegion.isConnectedToGate(gate)) {
            neighbors[neighborChunkRegion.getId()] = neighborChunkRegion
          }
        }
      }
    }

    if (options.all || !options.sameBiome) {
      let chunkRegions = this.chunk.getChunkRegions()
      for (let id in chunkRegions) {
        let chunkRegion = chunkRegions[id]
        if (chunkRegion !== this &&
            chunkRegion.isLandSkyConnected(this)) {
          neighbors[chunkRegion.getId()] = chunkRegion
        }
      }

    }

    if (options.passThroughWall) {
      let chunkRegions = this.chunk.getChunkRegions()
      for (let id in chunkRegions) {
        let chunkRegion = chunkRegions[id]

        let isBiomeSatisfied
        if (options.all) {
          isBiomeSatisfied = true
        } else if (options.sameBiome) {
          isBiomeSatisfied = chunkRegion.isSky === this.isSky
        } else {
          isBiomeSatisfied = chunkRegion.isSky !== this.isSky
        }

        if (chunkRegion !== this &&
            chunkRegion.isWallConnected(this) &&
            isBiomeSatisfied) {
          neighbors[chunkRegion.getId()] = chunkRegion
        }
      }
    }

    return Object.values(neighbors)
  }

  isConnectedToGate(otherGate) {
    let result = false

    let oppositeDirection = this.getOppositeDirection(otherGate.getDirection())
    for (let key in this.gates[oppositeDirection]) {
      let gate = this.gates[oppositeDirection][key]
      if (gate.isConnectedTo(otherGate)) {
        result = true
        break
      }
    }

    return result
  }

  isHomeArea() {
    let platform = this.getPlatformTile()
    return platform && platform.getRoom() && platform.getRoom().isHomeArea()
  }

  isStale() {
    return !this.chunk.chunkRegions[this.getId()]
  }

  // its possible to be null..
  getRoom() {
    let tileEntity = this.getRandomPlatformTile() 
    return tileEntity.getRoom()
  }

  getRandomTileCoord() {
    let tileKeyList = Object.keys(this.tiles)
    let randomIndex = Math.random() * tileKeyList.length << 0
    let tileKey = tileKeyList[randomIndex]
    let row = tileKey.split("-")[0]
    let col = tileKey.split("-")[1]
    return { row: row, col: col }
  }

  getRandomPlatformTile() {
    return this.getRandomPassableTile(this.tiles)
  }

  getRandomSkyEdgeTile() {
    return this.getRandomPassableTile(this.skyEdges)
  }

  getRandomGroundSkyEdgeTile() {
    return this.getRandomPassableTile(this.groundSkyEdges)
  }

  getRandomPassableTile(tileCollection) {
    let tileKeyList = Object.keys(tileCollection)

    let count = tileKeyList.length * 20
    let entity = null

    while (count > 0) {
      count -= 1
      let index = Math.floor(Math.random() * tileKeyList.length)
      let tileKey = tileKeyList[index]

      let data = this.getRowColFromTileKey(tileKey)
      let tile = this.chunk.sector.pathFinder.getTile(data.row, data.col)

      if (tile && !tile.isPathFindBlocker()) {
        entity = tile
        break
      }
    }

    return entity
  }

  getStructureCount() {
    return Object.keys(this.structures).length
  }

  getStructures() {
    return Object.values(this.structures) 
  }

  getPlayers() {
    return Object.values(this.players) 
  }

  getMobs() {
    return Object.values(this.mobs) 
  }

  getAttackableStructures() {
    let structures = {}

    for (let id in this.structures) {
      let structure = this.structures[id]
      let checkTrap = false
      if (BaseMob.prototype.canDamage(structure, checkTrap)) {
        structures[structure.getId()] = structure
      }
    }

    return structures
  }

  getRandomAttackableStructure() {
    let structures = this.getAttackableStructures()
    let firstStructureId = Object.keys(structures)[0]
    return structures[firstStructureId]
  }

  isEnterable() {

  }

  canBeEnteredFromSpace() {
    let result

    if (Object.keys(this.groundSkyEdges).length > 0) return true
    if (Object.keys(this.groundEdges).length > 0) return true

    for (let id in this.structures) {
      let structure = this.structures[id]
      if (structure.hasCategory("door") && structure.canBeEnteredFromSpace()) {
        result = true
        break
      }
    }

    return result
  }

  getRowColFromTileKey(tileKey) {
    let tokens = tileKey.split("-")

    return {
      row: parseInt(tokens[0]),
      col: parseInt(tokens[1])
    }
  }

  getOppositeDirection(direction) {
    switch(direction) {
      case "left":
        return "right"
        break
      case "up":
        return "down"
        break
      case "right":
        return "left"
        break
      case "down":
        return "up"
        break
    }
  }

  getNeighborChunkByDirection(direction) {
    let row
    let col

    switch(direction) {
      case "left":
        row = this.chunk.getRow()
        col = Math.max(0, this.chunk.getCol() - 1)
        break
      case "up":
        row = Math.max(0, this.chunk.getRow() - 1)
        col = this.chunk.getCol()
        break
      case "right":
        row = this.chunk.getRow()
        col = Math.min(this.chunk.sector.getColCount() - 1, this.chunk.getCol() + 1)
        break
      case "down":
        row = Math.min(this.chunk.sector.getRowCount() - 1, this.chunk.getRow() + 1)
        col = this.chunk.getCol()
        break
    }

    let neighborChunk = this.chunk.sector.getChunk(row, col)
    if (neighborChunk === this.chunk) return null // cant be self

    return neighborChunk
  }

  getId() {
    return this.id
  }

  getLandSkyTransitionEdges() {
    let edges = {}

    if (this.isSky) {
      edges = this.groundEdges
    } else {
      edges = this.groundSkyEdges
    }

    if (Object.keys(edges).length === 0) {
      let doors = this.getDoorsConnectedToSky()
      for (let id in doors) {
        let door = doors[id]
        let edge = this.getTileKey(door.getRow(), door.getCol())
        edges[edge] = true
      }
    }

    return edges
  }

  getDoorsConnectedToSky() {
    let result = {}

    for (let id in this.structures) {
      let structure = this.structures[id]
      if (structure.hasCategory("door") && structure.canBeEnteredFromSpace()) {
        result[structure.getId()] = structure
      }
    }

    return result
  }

  getRandomDirtyPlatform() {
    let dirtKeys = Object.keys(this.dirtMap)
    let randomIndex = Math.floor(Math.random() * dirtKeys.length)
    let dirtKey = dirtKeys[randomIndex]
    if (this.tiles[dirtKey]) {
      let row = dirtKey.split("-")[0]
      let col = dirtKey.split("-")[1]
      let platform = this.getStandingPlatform(row, col)
      if (platform && platform.hasCategory('platform') && platform.isPlatformDirtiable()) {
        return platform
      }
    }
  }

  getStandingPlatform(row, col) {
    return this.chunk.sector.getStandingPlatform(row, col)
  }
  

  getDirtyPlatforms() {
    let platforms = []

    let dirtKeys = Object.keys(this.dirtMap)
    for (var i = 0; i < dirtKeys.length; i++) {
      let dirtKey = dirtKeys[i]

      if (this.tiles[dirtKey]) {
        let row = dirtKey.split("-")[0]
        let col = dirtKey.split("-")[1]
        let platform = this.getStandingPlatform(row, col)
        if (platform && platform.isBuilding()) {
          platforms.push(platform)
        }
      }
    }

    return platforms
  }

  addTile(hit, row, col, neighbors) {
    let tileKey = this.getTileKey(row, col)
    this.tiles[tileKey] = true

    if (this.isSky) {
      this.onTileAddedForSkyChunkRegion(hit, row, col, neighbors, tileKey)
    } else {
      this.onTileAddedForGroundChunkRegion(hit, row, col, neighbors, tileKey)
    }
  }

  getWallWithBlockedNeighborRoom(room) {
    let result

    for (let id in this.walls) {
      let wall = this.walls[id]
      if (wall.isBlockingRoom(room)) {
        result = wall
        break
      }
    }

    return result
  }

  onTileAddedForSkyChunkRegion(hit, row, col, neighbors, tileKey) {
    if (this.isGroundEdge(hit, neighbors)) {
      this.groundEdges[tileKey] = true
    }

    let structure = this.chunk.sector.structureMap.get(row, col)
    if (structure) {
      this.structures[structure.id] = structure
    }

    let wall = this.chunk.sector.armorMap.get(row, col)
    if (wall) {
      this.walls[wall.id] = wall
      this.structures[wall.id] = wall
    }

    let distribution = this.chunk.sector.distributionMap.get(row, col)
    if(distribution) {
      this.distributions[distribution.id] = distribution
    }
  }

  setDirt(row, col, level) {
    let key = [row, col].join('-')
    this.dirtMap[key] = level

    this.setDirtLevel()
  }

  unsetDirt(row, col) {
    let key = [row, col].join('-')
    delete this.dirtMap[key]

    this.setDirtLevel()
  }

  setDirtLevel() {
    this.dirtLevel = this.calculateDirtLevel()
  }

  isDirty() {
    let minTiles = 12
    let dirtLevel = 3
    return this.dirtLevel > (minTiles * dirtLevel)
  }

  hasDirt() {
    return this.dirtLevel > 0
  }

  calculateDirtLevel() {
    let result = 0

    for (let key in this.dirtMap) {
      let level = this.dirtMap[key]
      result += level
    }

    return result
  }

  addSoilNetwork(soilNetwork) {
    this.soilNetworks[soilNetwork.getId()] = soilNetwork
  }

  removeSoilNetwork(soilNetwork) {
    delete this.soilNetworks[soilNetwork.getId()] 
  }

  onTileAddedForGroundChunkRegion(hit, row, col, neighbors, tileKey) {
    let dirtLevel = hit.entity && hit.entity.effects ? hit.entity.effects["dirt"] : 0
    if (dirtLevel && dirtLevel > 0) {
      this.setDirt(row, col, dirtLevel)
    }

    let structure = this.chunk.sector.structureMap.get(row, col)
    if (structure) {
      this.structures[structure.id] = structure
      // since structure is on top, it will hide the dirt
      this.unsetDirt(row, col)
    }

    let distribution = this.chunk.sector.distributionMap.get(row, col)
    if(distribution) {
      this.distributions[distribution.id] = distribution
    }

    let wall = this.chunk.sector.armorMap.get(row, col)
    if (wall) {
      this.walls[wall.id] = wall
      this.structures[wall.id] = wall
      // since wall is on top, it will hide the dirt
      this.unsetDirt(row, col)
    }

    let platform = this.chunk.sector.platformMap.get(row, col)
    if (platform && platform.hasCategory("soil")) {
      let soilNetwork = platform.getSoilNetwork()
      if (soilNetwork) {
        this.addSoilNetwork(soilNetwork)
        soilNetwork.addChunkRegion(this)
      }
    }

    if (this.isSkyEdge(hit, neighbors)) {
      this.skyEdges[tileKey] = true

      if (hit.entity.isGroundTile() || hit.entity.hasCategory("platform")) {
        this.groundSkyEdges[tileKey] = true
      }
    }

    if (this.isWaterEdge(hit, neighbors)) {
      this.waterEdges[tileKey] = true
    }
  }

  hasGroundSkyEdge() {
    return Object.keys(this.groundSkyEdges).length > 0
  }

  hasSkyEdge() {
    return Object.keys(this.skyEdges).length > 0
  }

  hasGroundEdge() {
    return Object.keys(this.groundEdges).length > 0
  }

  isSkyEdge(hit, neighbors) {
    if (!neighbors) return false
      
    let hasSkyTileNeighbor = neighbors.find((neighbor) => {
      return neighbor.type === 0
    })

    return hasSkyTileNeighbor
  }

  isWaterEdge(hit, neighbors) {
    if (!neighbors) return false
    if (!hit.entity) return false
    if (!hit.entity.isWater()) return false

    let hasNonWaterNeighbor = neighbors.find((neighbor) => {
      return neighbor.entity && 
             !neighbor.entity.isWater() &&
             !neighbor.entity.isPathFindBlocker()
    })

    return hasNonWaterNeighbor
  }

  isGroundEdge(hit, neighbors) {
    if (!neighbors) return false

    if (hit.entity) return false  
      
    let hasGroundTileNeighbor = neighbors.find((neighbor) => {
      return neighbor.entity && !neighbor.entity.isPathFindBlocker()
    })

    return hasGroundTileNeighbor
  }

  onFilled() {
    this.detectGates()
  }

  hasTile(row, col) {
    let tileKey = this.getTileKey(row, col)
    return this.tiles[tileKey]
  }

  getTileKey(row, col) {
    return row + "-" + col
  }

  detectGates() {
    ["left", "up", "right", "down"].forEach((direction) => {
      this.detectGatesForDirection(direction)
    })
  }

  detectGatesForDirection(direction) {
    let beginGate = false
    let prevEdge = {}
    let chunkGate

    this.chunk.forEachEdge(direction, (row, col) => {
      let isInChunkRegion = this.tiles[this.getTileKey(row, col)]
      let hit = this.getSector().pathFinder.getTileHit(row, col)
      let isGroundPassable = this.isPassable(hit)
      let shouldAddToChunkGate = isGroundPassable || !hit.entity
      hit.remove()

      if (!beginGate && isInChunkRegion && shouldAddToChunkGate) {
        beginGate = true
        chunkGate = new ChunkGate(this, direction)
        chunkGate.markStart(row, col)
        this.gates[direction] = this.gates[direction] || {}
        this.gates[direction][chunkGate.getId()] = chunkGate
      }

      if (beginGate && (!isInChunkRegion || !shouldAddToChunkGate)) {
        chunkGate.markEnd(prevEdge.row, prevEdge.col)
        beginGate = false
      }

      prevEdge = { row: row, col: col }
    })

    if (chunkGate && chunkGate.isNotTerminated()) {
      chunkGate.markEnd(prevEdge.row, prevEdge.col)
    }
  }

  getWanderTile() {
    if (this.shouldRebuildWanderTiles()) {
      this.createWanderTiles()
    }

    let randomIndex = (Math.random() * this.wanderTiles.length) << 0
    return this.wanderTiles[randomIndex]
  }

  shouldRebuildWanderTiles() {
    if (Object.keys(this.wanderTiles).length === 0) return true

    let duration = this.chunk.game.timestamp - this.wanderTilesCreateTimestamp
    let expiry = Constants.physicsTimeStep * 60 * 3 // 3 minutes
    let isExpired = duration >= expiry

    return isExpired
  }

  createWanderTiles() {
    this.wanderTiles = []

    let count = 3
    for (var i = 0; i < count; i++) {
      let tile = this.getRandomPassableTile(this.tiles)
      if (tile) {
        this.wanderTiles.push(tile)
      }
    }

    this.wanderTilesCreateTimestamp = this.chunk.game.timestamp
  }

  toJson() {
    let tilesJson = []
    for (let tileKey in this.tiles) {
      let data = this.getRowColFromTileKey(tileKey)
      tilesJson.push({ row: data.row, col: data.col })
    }

    let gatesJson = this.getAllGates().map((gate) => {
      return gate.toJson()
    })

    return {
      id: this.getId(),
      chunkId: this.chunk.getId(),
      tiles: tilesJson,
      gates: gatesJson
    }
  }

}

module.exports = ChunkRegion
