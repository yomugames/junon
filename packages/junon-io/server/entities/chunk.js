const Constants = require('../../common/constants.json')
const Protocol = require('../../common/util/protocol')
const SocketUtil = require("junon-common/socket_util")
const ChunkRegion = require("./chunk_region")
const ExceptionReporter = require("junon-common/exception_reporter")

class Chunk {
  constructor(sector, row, col) {
    this.sector = sector
    this.game = sector.game

    this.id = this.getKey(row, col)
    this.row = row
    this.col = col
    this.tileStartRow = row * Constants.chunkRowCount
    this.tileStartCol = col * Constants.chunkRowCount
    this.tileEndRow = (row + 1) * Constants.chunkRowCount - 1
    this.tileEndCol = (col + 1) * Constants.chunkRowCount - 1

    this.chunkRegions = {}

    this.subscribers = {}
    this.newSubscribers = {}
    this.changedBuildings = {}
    this.brokenBuildings = {}
    this.changedTerrains = {}
    this.changedRoomTiles = {}
    this.changedCorpses = {}
    this.changedMobs = {}
    this.changedPickups = {}
    this.changedTransports = {}

    this.changedPlayers = {}
    this.changedProjectiles = {}
  }

  rebuildRegions() {
    this.detectRegions()
  }

  buildRegions() {
    this.rebuildRegions()
  }

  getChunkRegion(row, col) {
    let result = null

    for (let id in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[id]
      if (chunkRegion.hasTile(row, col)) {
        result = chunkRegion
        break
      }
    }

    return result
  }

  getChunkRegionsAtRowCol(row, col) {
    let results = {}

    for (let id in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[id]
      if (chunkRegion.hasTile(row, col)) {
        results[chunkRegion.getId()] = chunkRegion
      }
    }

    return results
  }

  getChunkRegions() {
    return this.chunkRegions
  }

  getChunkRegionList() {
    return Object.values(this.chunkRegions)
  }

  isChunkRegionFillable(hit) {
    if (hit.entity && hit.entity.hasCategory("door")) return false

    return this.sector.pathFinder.isPassable(hit)
  }

  detectRegions() {
    let visited = {}
    let regionsCreated = 0

    this.forEachTile((row, col) => {
      if (!visited[this.getTileKey(row, col)]) {
        let hit = this.sector.pathFinder.getTileHit(row, col)
        let isFillable = this.isChunkRegionFillable(hit)
        let isEmpty = !hit.entity
        hit.remove()
        
        if (isFillable || isEmpty) {
          regionsCreated += 1
          let chunkRegion = new ChunkRegion(this, { isSky: isEmpty })

          let options = {
            shouldStop: this.shouldStopRegionFloodFill.bind(this, chunkRegion),
            includeStopIdentifier: this.shouldIncludeStopChunkRegion.bind(this),
            shouldRevisit: this.shouldRevisit.bind(this)
          }
          this.sector.pathFinder.chunkRegionFloodFill(row, col, options, (current, neighbors) => {
            chunkRegion.addTile(current, current.row, current.col, neighbors)
            visited[this.getTileKey(current.row, current.col)] = true
          })

          chunkRegion.onFilled()
        }
      }
    })

    if (regionsCreated === 0) {
      let chunkRegion = new ChunkRegion(this)
      this.forEachTile((row, col) => {
        chunkRegion.addTile({ row: row, col: col, entity: null}, row, col, null)
      })
    }

    // assign players/mobs
    let playersInChunk = this.sector.playerTree.search(this.getBoundingBox())
    playersInChunk.forEach((player) => {
      let newChunkRegion = player.getChunkRegion()
      player.registerToChunkRegion(newChunkRegion)
    })

    let mobsInChunk = this.sector.mobTree.search(this.getBoundingBox())
    mobsInChunk.forEach((mob) => {
      let newChunkRegion = mob.getChunkRegion()
      mob.registerToChunkRegion(newChunkRegion)
    })

    let corpsesInChunk = this.sector.unitTree.search(this.getBoundingBox())
    corpsesInChunk.forEach((corpse) => {
      let chunkRegions = corpse.getChunkRegions()
      corpse.registerToChunkRegions(chunkRegions)
    })

  }

  shouldIncludeStopChunkRegion(hit) {
    if (this.isBeyondChunkGateEdge(hit)) return false

    if (hit.entity) {
       if (!hit.entity.hasCategory("wall") &&
           hit.previousEntity && 
           hit.previousEntity.hasCategory("wall")) {
         return false
       }

      if (hit.entity.hasCategory('rail_stop')) return false
         
      return hit.entity.isPathFindBlocker()
    }
 
    return false
  }

  shouldRevisit(hit) {
    if (!hit.entity) return false

    // if structure is beside wall and not included, but it has neighbor floor
    // that is actually part of chunkRegion, then revisit it
    if (!hit.entity.hasCategory("wall") &&
        hit.previousEntity && 
        hit.previousEntity.hasCategory("wall")) {
      return true
    }

    return false
  }
  
  getRandomRow() {
    return this.tileStartRow + Math.floor(Math.random() * Constants.chunkRowCount)
  }

  getRandomCol() {
    return this.tileStartCol + Math.floor(Math.random() * Constants.chunkColCount)
  }

  isBeyondChunkGateEdge(hit) {
    let minChunkEdgeRow = Math.max(0,                         this.tileStartRow )
    let maxChunkEdgeRow = Math.min(this.sector.getRowCount(), this.tileEndRow   )
    let minChunkEdgeCol = Math.max(0,                         this.tileStartCol )
    let maxChunkEdgeCol = Math.min(this.sector.getColCount(), this.tileEndCol   )

    return hit.row < minChunkEdgeRow ||
           hit.row > maxChunkEdgeRow ||
           hit.col < minChunkEdgeCol ||
           hit.col > maxChunkEdgeCol
  }

  shouldStopRegionFloodFill(chunkRegion, hit, neighbors, originHit, sourceEntity) {
    let isSkyFloodFilling = originHit.type === 0
    if (isSkyFloodFilling) {
      let isWall = hit.entity && hit.entity.getType() === Protocol.definition().BuildingType.Wall
      if (isWall) {
        let edgeOfOtherChunkRegion = neighbors.find((neighbor) => {
          let isNeighborWall = neighbor.entity && neighbor.entity.getType() === Protocol.definition().BuildingType.Wall
          let isDifferentChunkRegion = this.sector.getChunkRegionAt(neighbor.row, neighbor.col) !== chunkRegion
          // let isSky = !neighbor.entity
          return !isNeighborWall && isDifferentChunkRegion
        })

        return this.isBeyondChunkGateEdge(hit) || edgeOfOtherChunkRegion
      } else {
        let isNotSky = hit.entity
        return isNotSky || this.isBeyondChunkGateEdge(hit)
      }
    } else {
      let isWall = hit.entity && hit.entity.getType() === Protocol.definition().BuildingType.Wall
      if (isWall) {
        let edgeOfOtherChunkRegion = neighbors.find((neighbor) => {
          let isPassable = this.sector.pathFinder.isPassable(neighbor, sourceEntity)
          return isPassable && 
                 neighbor.entity &&
                 neighbor.entity.getChunkRegion() !== chunkRegion
        })

        return this.isBeyondChunkGateEdge(hit) || edgeOfOtherChunkRegion
      } else {
        let isPassable = this.sector.pathFinder.isPassable(hit, sourceEntity)
        return this.isBeyondChunkGateEdge(hit) || !isPassable
      }
    }
  }

  shouldStopGateFloodFill(hit, neighbors, originHit, sourceEntity) {
    let minChunkEdgeRow = Math.max(0,                         this.tileStartRow - 1)
    let maxChunkEdgeRow = Math.min(this.sector.getRowCount(), this.tileEndRow   + 1)
    let minChunkEdgeCol = Math.max(0,                         this.tileStartCol - 1)
    let maxChunkEdgeCol = Math.min(this.sector.getColCount(), this.tileEndCol   + 1)

    let isBeyondChunkGateEdge = hit.row < minChunkEdgeRow ||
                                hit.row > maxChunkEdgeRow ||
                                hit.col < maxChunkEdgeCol ||
                                hit.col > maxChunkEdgeCol

    let isPassable = this.sector.pathFinder.isPassable(hit, sourceEntity)

    return isBeyondChunkGateEdge || !isPassable
  }

  getTileKey(row, col) {
    return row + "-" + col
  }

  getPlatformTile(row, col) {
    let platformTile = null

    let grids = [this.sector.platformMap, this.sector.groundMap]
    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let entity = grid.get(row, col)
      if (entity) {
        platformTile = entity
        break
      }
    }

    return platformTile
  }

  getPathFindBlockerTile(row, col) {
    let pathFindBlocker = null

    let grids = [this.sector.structureMap, this.sector.armorMap, this.sector.groundMap]
    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let entity = grid.get(row, col)
      if (entity && entity.isPathFindBlocker()) {
        pathFindBlocker = entity
        break
      }
    }

    return pathFindBlocker
  }

  forEachTile(cb) {
    for (let row = this.tileStartRow; row <= this.tileEndRow; row++) {
      for (let col = this.tileStartCol; col <= this.tileEndCol; col++) {
        cb(row, col)
      }
    }
  }

  forEachEdge(direction, cb) {
    switch (direction) {
      case "left":
        for (let row = this.tileStartRow; row <= this.tileEndRow; row++) {
          cb(row, this.tileStartCol)
        }
        break
      case "up":
        for (let col = this.tileStartCol; col <= this.tileEndCol; col++) {
          cb(this.tileStartRow, col)
        }
        break
      case "right":
        for (let row = this.tileStartRow; row <= this.tileEndRow; row++) {
          cb(row, this.tileEndCol)
        }
        break
      case "down":
        for (let col = this.tileStartCol; col <= this.tileEndCol; col++) {
          cb(this.tileEndRow, col)
        }
        break
    }
  }

  getKey(row, col) {
    return [row, col].join("-")
  }

  getId() {
    return this.id
  }

  getRow() {
    return this.row
  }

  getCol() {
    return this.col
  }

  isConnectedTo(otherChunk) {

  }

  addChangedMobs(entity) {
    this.changedMobs[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  addChangedPickups(entity) {
    this.changedPickups[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  addChangedCorpses(entity) {
    this.changedCorpses[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  addChangedTransports(entity) {
    this.changedTransports[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  addChangedBuildings(entity) {
    this.changedBuildings[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  addBrokenBuildings(entity) {
    this.brokenBuildings[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  sendChangedEntities() {
    this.sendChangedBuildingsToClients()
    this.sendChangedProjectilesToClients()
    this.sendChangedPlayersToClients()
    this.sendChangedCorpsesToClients()
    this.sendChangedMobsToClients()
    this.sendChangedPickupsToClients()
    this.sendChangedTransportsToClients()

    this.sendBrokenBuildingsToClients()

    // room info needs to be sent first before the tiles
    this.sendChangedRoomTilesToClients()
  }

  clearChangedBuildings() {
    for (let id in this.changedBuildings) {
      let building = this.changedBuildings[id]
      building.clearChangedAttributes()
    }

    this.changedBuildings = {}
  }

  clearBrokenBuildings() {
    this.brokenBuildings = {}
  }

  clearChangedCorpses() {
    this.changedCorpses = {}
  }

  clearChangedTransports() {
    this.changedTransports = {}
  }

  clearChangedMobs() {
    this.changedMobs = {}
  }

  clearChangedPickups() {
    this.changedPickups = {}
  }

  addChangedProjectiles(entity) {
    this.changedProjectiles[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  clearChangedProjectiles() {
    this.changedProjectiles = {}
  }

  clearChangedPlayers() {
    this.changedPlayers = {}
  }

  addChangedPlayers(entity) {
    // temp replacement solution for 09af920ee20c8d06ac82d33719aeabb7e5bd824c
    // maybe remove or fix properly in future
    if (isNaN(entity.x) || isNaN(entity.y)) return

    this.changedPlayers[entity.id] = entity
    this.sector.addChangedChunks(this)
  }

  sendBrokenBuildingsToClients() {
    let brokenBuildingList = Object.values(this.brokenBuildings)
    if (brokenBuildingList.length === 0) return

    brokenBuildingList.forEach((building) => {
      this.forEachSubscribers((player) => {
        // console.log("broken: " + building.id + " - " + building.getBreakProgress())
        SocketUtil.emit(player.getSocket(), "BreakBuilding", { id: building.id, progress: building.getBreakProgress() })
      })
    })

    this.clearBrokenBuildings()
  }

  sendEquipmentAnimation(entity) {
    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "Animate", { entityId: entity.getId() })
    })
  }

  stopEquipmentAnimation(entity) {
    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "Animate", { entityId: entity.getId(), shouldStop: true })
    })
  }

  sendChangedCorpsesToClients() {
    if (Object.keys(this.changedCorpses).length === 0) return

    if (this.sector.isFovMode()) {
      this.forEachSubscribers((player) => {
        if (player.shouldSkipFov()) {
          SocketUtil.emit(player.getSocket(), "EntityUpdated", { corpses: this.changedCorpses })
        }
      })
    } else {
      this.forEachSubscribers((player) => {
        SocketUtil.emit(player.getSocket(), "EntityUpdated", { corpses: this.changedCorpses })
      })
    }

    this.clearChangedCorpses()
  }

  sendChangedTransportsToClients() {
    if (Object.keys(this.changedTransports).length === 0) return

    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "EntityUpdated", { transports: this.changedTransports })
    })

    this.clearChangedCorpses()
  }

  sendChangedMobsToClients() {
    if (Object.keys(this.changedMobs).length === 0) return

    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "EntityUpdated", { mobs: this.changedMobs })
    })

    this.clearChangedMobs()
  }

  sendChangedPickupsToClients() {
    if (Object.keys(this.changedPickups).length === 0) return

    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "EntityUpdated", { pickups: this.changedPickups })
    })

    this.clearChangedPickups()
  }

  getRooms() {
    return this.sector.getRoomsByChunk(this)
  }

  getBuildings() {
    return this.sector.getBuildingsByChunk(this)
  }

  getAllData(shouldSkipFov) {
    let terrains  = this.sector.getTerrainsByChunk(this)
    let buildings = this.getBuildings()
    let pickups = this.sector.getPickupsByChunk(this)
    let mobs = this.sector.getMobsByChunk(this)

    let players = []
    let corpses = []
    if (this.sector.isFovMode()) {
      if (shouldSkipFov) {
        players = this.sector.getPlayersByChunk(this)
        corpses = this.sector.getCorpsesByChunk(this)
      }
    } else {
      players = this.sector.getPlayersByChunk(this)
      corpses = this.sector.getCorpsesByChunk(this)
    }
    
    let projectiles = this.sector.getProjectilesByChunk(this)
    let rooms = this.getRooms()

    let data = {
      row: this.row,
      col: this.col,
      terrains: terrains,
      buildings: buildings,
      corpses: corpses,
      mobs: mobs,
      pickups: pickups,
      projectiles: projectiles,
      players: players,
      transports: [],
      rooms: rooms
    }

    return data
  }

  sendAllToClient(player) {
    let data = this.getAllData(player.shouldSkipFov())
    // console.log("sent chunk  " + [this.row, this.col].join("-") + " size: " + Helper.roughSizeOfObject(data))

    SocketUtil.emit(player.getSocket(), "Chunk", data)


    if (this.sector.pathFinder.isDebugSubscriber(player)) {
      this.sendChunkRegions(player)
    }
  }

  sendChunkRegions(player) {
    let json = []
    let chunkRegions = this.getChunkRegions()
    for (let chunkRegionId in chunkRegions) {
      let chunkRegion = chunkRegions[chunkRegionId]
      json.push(chunkRegion.toJson())
    }

    SocketUtil.emit(player.getSocket(), "UpdateChunkRegion", { chunkRegions: json })
  }

  getSubscriberCount() {
    return Object.keys(this.subscribers).length
  }

  sendChangedBuildingsToClients() {
    let subscriberCount = this.getSubscriberCount()
    if (subscriberCount > 0) {
      if (Object.keys(this.changedTerrains).length > 0 ||
          Object.keys(this.changedBuildings).length) {
        this.forEachSubscribers((player) => {
          let deltaChangedBuildings = player.getDeltaJson("buildings", this.changedBuildings)
          SocketUtil.emit(player.getSocket(), "EntityUpdated", { buildings: deltaChangedBuildings, terrains: this.changedTerrains })
        })
      }
    }

    this.clearChangedBuildings()
    this.clearChangedTerrains()
  }

  sendChangedRoomTilesToClients() {
    if (Object.keys(this.changedRoomTiles).length === 0) return

    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "EntityUpdated", { roomTiles: this.changedRoomTiles })
    })

    this.clearChangedRoomTiles()
  }

  sendChangedProjectilesToClients() {
    if (Object.keys(this.changedProjectiles).length === 0) return

    this.forEachSubscribers((player) => {
      SocketUtil.emit(player.getSocket(), "EntityUpdated", { projectiles: this.changedProjectiles })
    })

    this.clearChangedProjectiles()
  }

  sendChangedPlayersToClients() {
    if (Object.keys(this.changedPlayers).length === 0) return

    if (this.sector.isFovMode()) {
      this.forEachSubscribers((player) => {
        if (player.shouldSkipFov()) {
          this.safeExecute(() => {
            SocketUtil.emit(player.getSocket(), "EntityUpdated", { players: this.changedPlayers })
          })
        }
      })
    } else {
      this.forEachSubscribers((player) => {
        this.safeExecute(() => {
          // sometimes player.health is not integer. guard against it and continue processing others
          SocketUtil.emit(player.getSocket(), "EntityUpdated", { players: this.changedPlayers })
        })
      })
    }

    this.clearChangedPlayers()
  }

  safeExecute(cb) {
    try {
      cb()
    } catch(e) {
      this.game.captureException(e)
    }
  }


  addChangedTerrains(entity) {
    this.changedTerrains[entity.getId()] = entity
    this.sector.addChangedChunks(this)
  }

  clearChangedTerrains() {
    this.changedTerrains = {}
  }

  addChangedRoomTiles(room, tile) {
    let tileKey = [tile.row, tile.col].join("-")
    this.changedRoomTiles[room.id] = this.changedRoomTiles[room.id] || { tiles: {} }
    this.changedRoomTiles[room.id].tiles[tileKey] = tile
    this.sector.addChangedChunks(this)
  }

  clearChangedRoomTiles() {
    this.changedRoomTiles = {}
  }

  forEachSubscribers(cb) {
    for (let id in this.subscribers) {
      cb(this.subscribers[id])
    }
  }

  addSubscriber(entity) {
    this.subscribers[entity.id] = entity
  }

  removeSubscriber(entity) {
    delete this.subscribers[entity.id]
  }

  getBoundingBox() {
    let minX = this.tileStartCol * Constants.tileSize
    let minY = this.tileStartRow * Constants.tileSize
    let maxX = this.tileEndCol * Constants.tileSize + Constants.tileSize
    let maxY = this.tileEndRow * Constants.tileSize + Constants.tileSize

    // we dont want to double include entities that are on chunk boundary
    let padding = 1

    return {
      minX: minX + padding,
      minY: minY + padding,
      maxX: maxX - padding,
      maxY: maxY - padding
    }
  }

  getBox() {
    let boundingBox = this.getBoundingBox()

    return {
      pos: {
        x: boundingBox.minX,
        y: boundingBox.minY
      },
      w: Constants.chunkRowCount * Constants.tileSize,
      h: Constants.chunkRowCount * Constants.tileSize
    }

  }



}

module.exports = Chunk
