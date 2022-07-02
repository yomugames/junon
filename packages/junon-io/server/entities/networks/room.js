const Pressurable = require('../../../common/interfaces/pressurable')
const Network = require('./network')
const Helper = require("../../../common/helper")
const Protocol = require('../../../common/util/protocol')
const BoundingBox = require("../../../common/interfaces/bounding_box")
const NetworkAssignable = require('../../../common/interfaces/network_assignable')
const Constants = require("../../../common/constants")
const AABB = require("p2").AABB

class Room extends Network {
  constructor(manager) {
    super(manager)

    this.owners = {}
    this.roomManager = manager
    this.container = manager.container
    this.sector = manager.container.sector
    this.game = this.sector.game

    this.isRoom = true
    this.isOxygenated = false
    this.shouldUpdateSpatialTree = false
    this.cachedIsAirtight = null

    this.size = 0
    this.oxygenPercentage = 0

    this.initPressurable()
    this.setPressureManager(manager.pressureManager)
    this.reset()

    this.touchActivity()
  }

  initMembers() {
    this.tiles = {}
    this.edgeTiles = {}

    this.doors = {} // door can more than 1 tile, so use hash to avoid duplication
    this.vents = {}
    this.oxygenStorages = {}
    this.airDetectors = {}
    this.structures = {}

    this.tileCount = 0
    this.edgeTileCount = 0
  }

  consumeOxygen(consumer) {
    let oxygenNetwork = this.getOxygenatedNetwork()
    if (oxygenNetwork) {
      oxygenNetwork.consumeResource(consumer)
    }
  }

  getStructureCount() {
    return Object.keys(this.structures).length
  }

  canBeEnteredFromSpace() {
    let result

    for (let doorId in this.doors) {
      let hit = this.doors[doorId]
      if (hit.entity.canBeEnteredFromSpace()) {
        result = true
        break
      }
    }

    return result
  }

  canEnter(entity) {
    let result = false

    for (let doorId in this.doors) {
      let hit = this.doors[doorId]
      if (hit.entity.isAllowedToPass(entity)) {
        result = true
        break
      }
    }

    return result
  }

  hasDirt() {
    return this.getChunkRegions().find((chunkRegion) => {
      return chunkRegion.hasDirt()
    })
  }

  hasDoorEnterableFromRoom(room) {
    let result

    for (let doorId in this.doors) {
      let hit = this.doors[doorId]
      if (hit.entity.rooms[room.getId()]) {
        result = true
        break
      }
    }

    return result
  }

  hasDoor() {
    return Object.keys(this.doors).length
  }

  hasSkyEdge() {
    return this.isConnectedToSky
  }

  getDoorCount() {
    return this.getDoors().length
  }

  getSkyEdgeChunkRegions() {
    let chunkRegions = this.getChunkRegions()
    return chunkRegions.filter((chunkRegion) => {
      return chunkRegion.hasSkyEdge()
    })
  }

  getRaidSpawnTile() {
    // if it has sky edge, spawn near sky edge ground
    // if it has door, spawn near door

    let chunkRegions = this.getChunkRegions()

    // prefer ones that has ground connected to sky..instead of wall
    let groundSkyEdgeChunkRegions = chunkRegions.filter((chunkRegion) => {
      return chunkRegion.hasGroundSkyEdge()
    })

    if (groundSkyEdgeChunkRegions.length > 0) {
      let randomIndex = Math.floor(Math.random() * groundSkyEdgeChunkRegions.length)
      let groundSkyEdgeChunkRegion = groundSkyEdgeChunkRegions[randomIndex]
      let skyEdgeTile = groundSkyEdgeChunkRegion.getRandomGroundSkyEdgeTile()
      if (skyEdgeTile) return skyEdgeTile
      return groundSkyEdgeChunkRegion.getRandomPlatformTile()
    }

    // check wall sky edges
    let skyEdgeChunkRegions = chunkRegions.filter((chunkRegion) => {
      return chunkRegion.hasSkyEdge()
    })

    if (skyEdgeChunkRegions.length > 0) {
      let randomIndex = Math.floor(Math.random() * skyEdgeChunkRegions.length)
      let skyEdgeChunkRegion = skyEdgeChunkRegions[randomIndex]
      return skyEdgeChunkRegion.getRandomPlatformTile()
    }

    let spaceDoorChunkRegion = chunkRegions.find((chunkRegion) => {
      return chunkRegion.canBeEnteredFromSpace()
    })

    if (spaceDoorChunkRegion) {
      return spaceDoorChunkRegion.getRandomPlatformTile()
    }

    return chunkRegions[0] && chunkRegions[0].getRandomPlatformTile()
  }

  getRaidSpawnScore() {
    let isOutsideWalls = !this.isHomeArea()
    let neighborCount = this.getNeighborRooms().length
    let doorCount = this.getDoorCount()
    let structureCount = this.getStructureCount()
    let spawnGround = this.getRaidSpawnTile()

    if (!spawnGround) return 20

    if (isOutsideWalls && neighborCount > 0 && doorCount > 0) {
      return 1
    } else if (isOutsideWalls && neighborCount > 0) {
      return 2
    } else if (isOutsideWalls && structureCount > 1) {
      return 3
    } else if (isOutsideWalls && this.hasSkyEdge()) {
      return 4
    } else if (this.hasSkyEdge()) {
      return 5
    } else {
      return 6
    }
  }

  isCoveredInWalls() {
    return false
  }

  getChunkRegions() {
    let chunkRegions = {}

    let iterationCount = 3

    for (var i = 0; i < iterationCount; i++) {
      let platform = this.getRandomUnoccupiedPlatform()
      if (platform) {
        let chunkRegion = platform.getChunkRegion()
        if (!chunkRegion) continue

        chunkRegions[chunkRegion.id] = chunkRegion
          
        let chunkRegionPath = chunkRegion.requestChunkRegionPath()

        for (let nodeId in chunkRegionPath.nodes) {
          let node = chunkRegionPath.nodes[nodeId]
          let tile = node.chunkRegion.getRandomPlatformTile()
          if (tile && tile.room === this) {
            chunkRegions[node.chunkRegion.id] = node.chunkRegion
          }
        }
      }
    }

    return Object.values(chunkRegions)
  }

  traverseRooms(cb) {
    let initialRoom = this

    let visitedRooms = {}
    let frontier = [initialRoom]
    visitedRooms[initialRoom.getId()] = true
    let room

    while (frontier.length > 0) {
      room = frontier.shift()
      cb(room)

      let rooms = room.getNeighborRooms()
      rooms.forEach((room) => {
        if (!visitedRooms[room.getId()]) {
          frontier.push(room)
          visitedRooms[room.getId()] = true
        }
      })
    }
  }

  getCenter() {
    let rowSum = 0
    let colSum = 0

    Object.values(this.tiles).forEach((tile) => {
      rowSum += tile.row
      colSum += tile.col
    })

    Object.values(this.edgeTiles).forEach((tile) => {
      rowSum += tile.row
      colSum += tile.col
    })

    let tileCount = Object.keys(this.tiles).length + Object.keys(this.edgeTiles).length

    let centerX = (colSum / tileCount) * Constants.tileSize
    let centerY = (rowSum / tileCount) * Constants.tileSize

    return {
      x: Math.floor(centerX),
      y: Math.floor(centerY)
    }
  }

  getTileCount() {
    return this.getInnerTileCount() + this.getEdgeTileCount()
  }

  getInnerTileCount() {
    return Object.keys(this.tiles).length
  }

  getEdgeTileCount() {
    return Object.keys(this.edgeTiles).length
  }

  getOxygenNetworks() {
    let networks = {}
    this.getOxygenComponents((component) => {
      let network = component.entity.oxygenNetwork
      if (network) {
        networks[network.id] = network
      }
    })

    return Object.values(networks)
  }

  getPressureNetwork() {
    return this.pressureNetwork
  }

  getRandomTile() {
    let tileKeys = Object.keys(this.tiles)
    const index = Math.floor(Math.random() * tileKeys.length)
    const key = tileKeys[index]
    return this.tiles[key].entity
  }

  addTile(hit) {
    let key = this.getTileKey(hit)
    this.tiles[key] = hit
    this.size += 1
    this.onTileAdded(hit)

    if (hit.entity.isGroundTile()) {
      this.hasAsteroidGround = true
    }
  }

  isOccupied(platform) {
    let isStructureOccupied = platform.isOccupied()
    return isStructureOccupied
  }

  isSkyEdge(neighbors) {
    let hasSkyTileNeighbor = neighbors.find((neighbor) => {
      return !neighbor.entity && 
             !this.container.isOutOfBounds(neighbor.row, neighbor.col)
    })

    return hasSkyTileNeighbor
  }

  getWallWithBlockedNeighborRoom() {
    let chunkRegions = this.getChunkRegions()

    let wall
    let chunkRegion

    for (var i = 0; i < chunkRegions.length; i++) {
      chunkRegion = chunkRegions[i]
      wall = chunkRegion.getWallWithBlockedNeighborRoom(this)
      if (wall) {
        break
      }
    }

    return wall
  }

  getRandomUnoccupiedPlatform() {
    let tileKeys = Object.keys(this.tiles)
    Helper.shuffleArray(tileKeys)

    let unoccupiedTileKey = tileKeys.find((tileKey) => {
      let tile = this.tiles[tileKey]
      if (!tile) return false
      if (tile.entity.isOccupied()) return false

      if (tile.entity.isTerrain()) {
        return tile.entity.isGround()
      } else {
        return true
      }
    })

    let tile = this.tiles[unoccupiedTileKey]

    return tile && tile.entity
  }

  getRandomUnoccupiedGround() {
    let tileList = Object.values(this.tiles)
    let unoccupiedTileList = tileList.filter((tile) => {
      if (!tile) return false
      if (tile.entity.isOccupied()) return false

      return tile.entity.isTerrain() && tile.entity.isGround()
    })

    if (unoccupiedTileList.length === 0) return null

    let randomIndex = Math.floor(Math.random() * unoccupiedTileList.length)
    return unoccupiedTileList[randomIndex].entity
  }


  removeMember(entity) {
    let hits = entity.getHits()
    hits.forEach((hit) => {
      this.removeTile(hit)
      this.removeEdgeTile(hit)
    })

    delete this.vents[entity.id]
    delete this.oxygenStorages[entity.id]
    delete this.airDetectors[entity.id]
    delete this.structures[entity.id]

    if (this.doors[entity.id]) {
      this.removeDoor(entity)
    }

    this.onOxygenComponentChanged()
  }

  removeTile(hit) {
    let key = this.getTileKey(hit)

    this.unassignNetworkFromEntity(hit, this)

    delete this.tiles[key]
    this.size += 1

    this.onTileRemoved(hit)
  }

  getTileKey(hit) {
    return hit.row + "-" + hit.col
  }

  hasTile(hit) {
    let key = this.getTileKey(hit)
    return this.tiles[key] || this.edgeTiles[key]
  }

  addDoor(hit) {
    this.doors[hit.entity.id] = hit
  }

  removeDoor(entity) {
    delete this.doors[entity.id]
    this.removePressureSealer(entity)
  }

  getDoors() {
    return Object.values(this.doors)
  }

  getNeighborDoors(door) {
    let roomDoors = this.getDoors()
    return roomDoors.filter((hit) => {
      return hit.entity.id !== door.id
    })
  }

  getNeighborRooms() {
    let rooms = {}

    for (let key in this.edgeTiles) {
      let hit = this.edgeTiles[key]
      if (hit.entity.rooms) {
        for (let key in hit.entity.rooms) {
          let roomId = parseInt(key)
          let room = hit.entity.rooms[roomId]
          let isNewRoom = roomId !== this.id
          if (isNewRoom) {
            rooms[roomId] = room
          }
        }
      }
    }

    return Object.values(rooms)
  }

  // if door is not open, room is not reachable
  getNeighborReachableRooms() {
    let neighbors = []

    for (let key in this.doors) {
      let hit = this.doors[key]
      let door = hit.entity
      if (door.isOpen) {
        for (let roomId in door.rooms) {
          let room = door.rooms[roomId]
          if (room !== this) {
            neighbors.push(room)
          }
        }
      }
    }

    return neighbors
  }

  addVent(hit) {
    this.vents[hit.entity.id] = hit
    this.onOxygenComponentChanged()
  }

  removeVent(entity) {
    delete this.vents[entity.id]
    this.onOxygenComponentChanged()
  }

  checkOxygenLevels() {
    let isOxygenated = this.checkIsOxygenated()
    if (this.isOxygenated !== isOxygenated) {
      this.isOxygenated = isOxygenated
      this.onRoomOxygenatedChanged()
    }
  }

  executeTurn() {
    this.checkOxygenLevels()
  }

  updateSpatialTree() {
    if (this.shouldUpdateSpatialTree) {
      this.sector.removeEntityFromTreeByName(this, "rooms")
      this.sector.insertEntityToTreeByName(this, "rooms")
      this.shouldUpdateSpatialTree = false
    }
  }

  onRoomOxygenatedChanged() {
    this.assignOxygenPercentage()

    this.getRoomComponents((hit) => {
      hit.entity.onRoomOxygenatedChanged()
    })
  }

  getOxygenComponents(cb) {
    for (let id in this.vents) {
      cb(this.vents[id])
    }

    for (let id in this.oxygenStorages) {
      cb(this.oxygenStorages[id])
    }
  }

  getRoomComponents(cb) {
    this.getOxygenComponents(cb)

    for (let id in this.airDetectors) {
      cb(this.airDetectors[id])
    }
  }

  addOxygenStorage(hit) {
    this.oxygenStorages[hit.entity.id] = hit
    this.onOxygenComponentChanged()
  }

  addAirDetector(hit) {
    this.airDetectors[hit.entity.id] = hit
    this.onOxygenComponentChanged()
  }

  addStructure(hit) {
    this.structures[hit.entity.id] = hit
    this.addRoomToOwner(hit)

    if (hit.entity.hasCategory("mining_drill")) {
      this.containsMiningDrill = true
    }
  }

  getRandomStructureForMob(mob) {
    let structureKeys = Object.keys(this.structures)
    let maxIteration = structureKeys.length * 4

    let result

    for (var i = 0; i < maxIteration; i++) {
      let randomIndex = Math.floor(Math.random() * structureKeys.length)
      let randomKey = structureKeys[randomIndex]
      let structure = this.structures[randomKey].entity
      if (mob.isPathFindTargetReachable(structure) && 
          mob.canAttack(structure)) {
        result = structure
        break
      }
    }

    return result
  }

  getStructureCount() {
    return Object.keys(this.structures).length
  }

  onOxygenComponentChanged() {
  }

  getOxygenManager() {
    return this.roomManager.oxygenManager
  }

  hasOxygenSource() {
    return Object.keys(this.oxygenStorages).length > 0
  }

  addEdgeTile(hit, neighbors) {
    let key = this.getTileKey(hit)
    this.edgeTiles[key] = hit
    this.onTileAdded(hit)
    this.edgeTileCount += 1

    if (hit.entity.hasCategory("astreoid")) {
      this.isBesideAsteroid = true
    }

    if (neighbors && this.isSkyEdge(neighbors)) {
      this.isConnectedToSky = true
    }
  }

  transferEdgeToNonEdge(hit) {
    let key = this.getTileKey(hit)
    delete this.edgeTiles[key]
    this.tiles[key] = hit
  }

  isEdgeTile(hit) {
    let key = this.getTileKey(hit)
    return this.edgeTiles[key]
  }

  addRoomToOwner(hit) {
    let owner = hit.entity.owner
    if (owner) {
      this.owners[owner.getId()] = owner
      owner.addRoom(this)
    }
  }

  onTileAdded(hit) {
    this.addRoomToOwner(hit)

    this.cachedIsAirtight = null
    this.tileCount += 1
  }

  hasAsteroid() {
    return this.isBesideAsteroid && this.hasAsteroidGround
  }

  hasMiningDrill() {
    return this.containsMiningDrill
  }

  onTileRemoved(hit) {
    this.cachedIsAirtight = null

    this.tileCount -= 1
  }

  removeEdgeTile(hit) {
    let key = this.getTileKey(hit)

    this.unassignNetworkFromEntity(hit, this)
    delete this.edgeTiles[key]
    this.onTileRemoved(hit)

    this.edgeTileCount -= 1
  }

  assignNetworkToEntity(hit, network) {
    this.roomManager.assignNetworkToEntity(hit, network)
  }

  onNetworkAssigned(hit) {
    this.sendTileChunkUpdate(hit)
    this.touchActivity()
    this.shouldUpdateSpatialTree = true
  }

  isReadyForSpatialTree() {
    let seconds = 1
    let ticksDelay = Constants.physicsTimeStep * seconds

    return this.game.timestamp - this.timestamp > ticksDelay
  }

  touchActivity() {
    this.timestamp = this.game.timestamp
  }

  onNetworkUnassigned(hit) {
    // if room is gonna be deleted anyway, no need to to tile updates
    if (this.clientMustDelete) return

    let json = { row: hit.row, col: hit.col, clientMustDelete: true }
    this.sendTileChunkUpdate(json)
    this.touchActivity()
    this.shouldUpdateSpatialTree = true
  }

  sendTileChunkUpdate(hit) {
    if (this.disableSendTileUpdate) return

    let chunkRow = Helper.getChunkRowFromRow(hit.row)
    let chunkCol = Helper.getChunkColFromCol(hit.col)
    let chunk = this.sector.getChunk(chunkRow, chunkCol)

    if (chunk) {
      chunk.addChangedRoomTiles(this, hit)
    }
  }

  unassignNetworkFromEntity(hit, network) {
    this.roomManager.unassignNetworkFromEntity(hit, network)
    this.onNetworkUnassigned(hit)
  }

  isHomeArea() {
    return this.isRegisteredToHomeArea
  }

  isAirtight() {
    if (this.tileCount === 0) return false
    if (this.edgeTileCount === 0) return false

    if (this.cachedIsAirtight === null) {
      let areAllEdgesAirtight = true
      for (let id in this.edgeTiles) {
        let hit = this.edgeTiles[id]
        if (!hit.entity.isAirtight()) {
          areAllEdgesAirtight = false
          break
        }
      }

      this.cachedIsAirtight = areAllEdgesAirtight
    }

    return this.cachedIsAirtight
  }

  isAirtightAndSealed() {
    if (!this.isAirtight()) return false

    let doorWithVacuum = this.getDoorWithVacuum()

    return !doorWithVacuum
  }

  getDoorWithVacuum() {
    let result 

    for (let key in this.doors) {
      let hit = this.doors[key]
      let door = hit.entity
      if (door.hasVacuum(this)) {
        result = door
        break
      }
    }

    return result
  }

  getOxygenatedNetwork() {
    return this.getOxygenNetworks().find((network) => {
      return network.hasStorage() && network.hasEnoughStored()
    })
  }

  hasOxygenatedNetwork() {
    return !!this.getOxygenatedNetwork()
  }

  getConnectedRoomsViaOxygenNetwork() {
    let rooms = {}

    this.getOxygenNetworks().forEach((oxygenNetwork) => {
      let roomList = oxygenNetwork.getConnectedRooms()
      roomList.forEach((room) => {
        rooms[room.getId()] = room
      })
    })

    return Object.values(rooms)
  }

  oxygenPercentageWillNotChange(oxygenStorage) {
    if (this.oxygenPercentage === 100) {
      if (oxygenStorage.getResourceStored("oxygen") >= 100) return true

      let roomOxygen = this.getAccessibleOxygenStorages()
                           .reduce((sum, storage) => { 
        return sum + storage.getResourceStored('oxygen') 
      }, 0)

      if (roomOxygen >= 100) return true
    }

    return false
  }

  getTotalOxygenAvailable() {
    if (!this.isOxygenated) return 0

    let storages = {}

    // combine all rooms pressure network.
    let pressureNetwork = this.getPressureNetwork()
    if (pressureNetwork) {
      pressureNetwork.forEachRoom((room) => {
        let storageList = room.getAccessibleOxygenStorages()
        storageList.forEach((storage) => {
          storages[storage.id] = storage
        })
      })
    } else {
      let storageList = this.getAccessibleOxygenStorages()
      storageList.forEach((storage) => {
          storages[storage.id] = storage
      })
    }

    return Object.values(storages).reduce((sum, storage) => {
      return sum + storage.getResourceStored("oxygen")
    }, 0)
  }

  getAccessibleOxygenStorages() {
    let storages = {}

    this.getOxygenNetworks().forEach((oxygenNetwork) => {
      for (let id in oxygenNetwork.storages) {
        let hit = oxygenNetwork.storages[id]
        let storage = hit.entity
        storages[id] = storage
      }
    })

    return Object.values(storages)
  }

  calculateOxygenPercentage() {
    let totalOxygen = this.getTotalOxygenAvailable()
    return Math.min(100, totalOxygen)
  }

  assignOxygenPercentage() {
    let oxygenPercentage = this.calculateOxygenPercentage()
    this.setOxygenPercentage(oxygenPercentage)
  }

  setOxygenPercentage(oxygenPercentage) {
    let prevOxygenPercentage = this.oxygenPercentage

    this.oxygenPercentage = oxygenPercentage

    if (this.oxygenPercentage !== prevOxygenPercentage) {
      this.onOxygenPercentageChanged()
    }
  }

  onOxygenPercentageChanged() {
    this.onStateChanged("oxygenPercentage")
  }

  checkIsOxygenated() {
    if (!this.isAirtight()) return false

    let pressureNetwork = this.getPressureNetwork()
    if (pressureNetwork) {
      let hasPressure = pressureNetwork.hasPressure()

      // might not be needed
      let hasOxygen   = pressureNetwork.calculateOxygenatedCombinedNetwork()

      return hasPressure && hasOxygen
    } else {
      return this.hasOxygenatedNetwork()
    }
  }

  onCreateSuccess() {
    this.createdAt = Date.now()

    // the room will already contain tiles/edgeTiles to be sent to player
    // no need to resend invidivual tiles to chunks
    this.disableSendTileUpdate = true
    this.assignRoomsToEntities()
    this.disableSendTileUpdate = false
    this.pressurizeRoom()

    if (debugMode) {
      this.x = this.getX()
      this.y = this.getY()
    }

    // must be called after assignRoomsToEntities
    // since getChunks depends on boundingBox which depends on room assignment
    this.updateRbushCoords()
    this.onStateChanged()

    if (this.isAirtight()) {
      this.container.homeArea.addRoomToHomeArea(this)
      this.isRegisteredToHomeArea = true
    }
  }

  pressurizeRoom() {
    for (let id in this.sealers) {
      let sealer = this.sealers[id]
      sealer.pressurize()
    }
  }

  getOwner() {
    return this.owner
  }

  isEmpty() {
    return Object.keys(this.tiles).length === 0
  }

  /* Not used. should removed?? */
  setOwnership() {
    let tileHits = Object.values(this.edgeTiles).concat(Object.values(this.tiles))

    let buildingHits = tileHits.filter((hit) => {
      return hit.entity.isBuilding()
    })

    let building = buildingHits[0]

    if (building) {
      this.owner = building.entity.getOwner()
    }
  }

  forEachInnerTile(callback) {
    for (let tileId in this.tiles) {
      callback(this.tiles[tileId])
    }
  }

  finalizeRoomAssignment(hit) {
    if (hit.entity.hasCategory("door")) {
      // now that we know this room is airtight, we can add it as pressure sealer
      this.addPressureSealer(hit.entity)
      hit.entity.onSealerStateChanged()
    }
  }

  assignRoomsToEntities() {
    for (let key in this.edgeTiles) {
      let hit = this.edgeTiles[key]
      this.assignNetworkToEntity(hit, this)
      this.finalizeRoomAssignment(hit)
    }

    for (let key in this.tiles) {
      let hit = this.tiles[key]
      this.assignNetworkToEntity(hit, this)
    }

    for (let key in this.vents) {
      let hit = this.vents[key]
      this.assignNetworkToEntity(hit, this)
    }

    for (let key in this.oxygenStorages) {
      let hit = this.oxygenStorages[key]
      this.assignNetworkToEntity(hit, this)
    }

    for (let key in this.airDetectors) {
      let hit = this.airDetectors[key]
      this.assignNetworkToEntity(hit, this)
    }
  }

  // different from reset that this removes an actual materialized room instead of temporary one
  remove() {
    this.container.homeArea.removeFromHomeArea(this)
    this.sector.removeEntityFromTreeByName(this, "rooms")

    this.clientMustDelete = true
    this.onStateChanged("clientMustDelete")

    this.reset()
  }

  getContainer() {
    return this.container
  }

  onStateChanged(attribute) {
    let chunksById = this.getChunks()
    for (let id in chunksById) {
      let chunk = chunksById[id]
      chunk.forEachSubscribers((player) => {
        player.addChangedRooms(this)
      })
    }
  }

  getChunks() {
    let boundingBox = this.getBoundingBox()
    let chunksById = Helper.getChunksFromBoundingBox(this.sector, boundingBox)
    return chunksById
  }

  getAABB() {
    let boundingBox = this.getBoundingBox()

    return new AABB({
      lowerBound: [boundingBox.minX, boundingBox.minY],
      upperBound: [boundingBox.maxX, boundingBox.maxY]
    })
  }

  isOverwritten() {

  }

  overlaps(otherRoom) {
    let result = false

    for (let id in this.tiles) {
      let hit = this.tiles[id]
      if (otherRoom.hasTile(hit)) {
        result = true
        break
      }
    }

    return result
  }

  reset() {
    for (let ownerId in this.owners) {
      let owner = this.owners[ownerId]
      owner.removeRoom(this)
    }

    this.owners = {}

    for (let id in this.edgeTiles) {
      let hit = this.edgeTiles[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.tiles) {
      let hit = this.tiles[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.doors) {
      let hit = this.doors[id]
      this.removeDoor(hit.entity)
    }

    for (let id in this.vents) {
      let hit = this.vents[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.oxygenStorages) {
      let hit = this.oxygenStorages[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.airDetectors) {
      let hit = this.airDetectors[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    this.oxygenStorages = {}
    this.airDetectors = {}
    this.structures = {}
    this.vents = {}
    this.doors = {}
    this.tiles = {}
    this.edgeTiles = {}
    this.chunkRegions = {}

    this.removeFromPressureNetwork()
  }

  onWorldPostStep() {

  }

  addChunkRegion(chunkRegion) {
    this.chunkRegions[chunkRegion.id] = chunkRegion
  }

  removeChunkRegion(chunkRegion) {
    delete this.chunkRegions[chunkRegion.id]
  }

  getTilesJson() {
    let edgeTiles = Object.values(this.edgeTiles).map((hit) => {
      return { row: hit.row, col: hit.col }
    })

    let tiles = Object.values(this.tiles).map((hit) => {
      return { row: hit.row, col: hit.col }
    })

    return edgeTiles.concat(tiles)
  }

  getWidth() {
    let minX = 1000000
    let maxX = 0

    Object.values(this.edgeTiles).map((hit) => {
      let leftEdge  = (hit.col * Constants.tileSize) - Constants.tileSize / 2
      let rightEdge = (hit.col * Constants.tileSize) + Constants.tileSize / 2

      minX = Math.min(minX, leftEdge)
      maxX = Math.max(maxX, rightEdge)
    })

    Object.values(this.tiles).map((hit) => {
      let leftEdge  = (hit.col * Constants.tileSize) - Constants.tileSize / 2
      let rightEdge = (hit.col * Constants.tileSize) + Constants.tileSize / 2

      minX = Math.min(minX, leftEdge)
      maxX = Math.max(maxX, rightEdge)
    })

    return maxX - minX
  }

  getHeight() {
    let minY = 1000000
    let maxY = 0

    Object.values(this.edgeTiles).map((hit) => {
      let topEdge    = (hit.row * Constants.tileSize) - Constants.tileSize / 2
      let bottomEdge = (hit.row * Constants.tileSize) + Constants.tileSize / 2

      minY = Math.min(minY, topEdge)
      maxY = Math.max(maxY, bottomEdge)
    })

    Object.values(this.tiles).map((hit) => {
      let topEdge    = (hit.row * Constants.tileSize) - Constants.tileSize / 2
      let bottomEdge = (hit.row * Constants.tileSize) + Constants.tileSize / 2

      minY = Math.min(minY, topEdge)
      maxY = Math.max(maxY, bottomEdge)
    })

    return maxY - minY
  }

  // not including tiles/edge tiles
  toBasicJson() {
    let data = {
      id: this.id,
      oxygenPercentage: this.oxygenPercentage,
      isOxygenated: this.isOxygenated,
      clientMustDelete: this.clientMustDelete,
    }

    if (this.x) data.x = this.x
    if (this.y) data.y = this.y

    return data
  }

}

Object.assign(Room.prototype, Pressurable.prototype, {
})

Object.assign(Room.prototype, BoundingBox.prototype, {
  getX() {
    return this.getCenter().x
  },
  getY() {
    return this.getCenter().y
  }
})

Object.assign(Room.prototype, NetworkAssignable.prototype, {
  onNetworkAssignmentChanged(networkName) {
  }
})

module.exports = Room
