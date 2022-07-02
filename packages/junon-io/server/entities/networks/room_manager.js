const Room = require("./room")
const Constants = require('../../../common/constants.json')
const NetworkManager = require("./network_manager")
const RoomPartitionRequest = require("./room_partition_request")
const ExceptionReporter = require('junon-common/exception_reporter')
const debug = require('debug')('room')

class RoomManager extends NetworkManager {
  constructor(container) {
    super(container)

    this.game = container.game
    this.partitionRequestsByTile = {}
    this.partitionRequests = {}
    this.pressureManager = container.pressureManager
    this.queue = []
  }

  cleanup() {
    let rooms = this.rooms

    for (let id in rooms) {
      let room = rooms[id]
      room.remove()
    }

    this.networks = {}

    this.partitionRequests = {}
    this.partitionRequestsByTile = {}
    this.queue = []
  }

  getQueue() {
    return this.queue
  }

  processPartitionRequestQueue() {
    // check what needs to be added to queue
    for (let id in this.partitionRequests) {
      let partitionRequest = this.partitionRequests[id]
      if (partitionRequest.isReady()) {
        let sourceTileData = Object.values(partitionRequest.sourceTiles)[0]
        let neighbors = this.getNeighbors(sourceTileData)
        let neighborInExistingPartitionRequest
        this.getQueue().push(partitionRequest)
        // console.log("untrack partitionRequests: " + partitionRequest.id)
        this.untrackPartitionRequest(partitionRequest)
      }
    }

    // check queue
    let queue = this.getQueue()

    let partitionRequest = queue[0]
    while (partitionRequest && partitionRequest.isCompletedOrCanceled()) {
      debug("discarding partitionRequest from queue as isCompletedOrCanceled: " + partitionRequest.id)
      queue.shift()
      partitionRequest = queue[0]
    }

    if (partitionRequest) {
      if (!partitionRequest.isProgressing()) {
        debug("partitionRequest.performAsync " + partitionRequest.id)
        partitionRequest.performAsync()
      }
    }
  }

  onRoomStale(room) {
    delete this.rooms[room.id]
    room.remove()
  }

  onRoomNeeded(room) {
    this.rooms[room.id] = room
    room.onCreateSuccess()

    if (this.onRoomCreateSuccessListener) {
      this.onRoomCreateSuccessListener.onRoomCreateSuccess(room)
    }
  }

  onRoomEntityAdded(hit, room, neighbors) {
    this.assignNetwork(hit, room, neighbors)
    this.assignNetworkToEntity(hit, room)
  }

  getNetworkKlass() {
    return Room
  }

  isNetworkEdge(hit, neighbors, network) {
    if (!hit.entity) return true
    if (!neighbors) return true

    let isOnEdgeOfMap = this.container.isSector() &&
                        (hit.row === this.container.getRowCount() - 1 ||
                         hit.row === 0 ||
                         hit.col === this.container.getColCount() - 1 ||
                         hit.col === 0
                        )

    if (isOnEdgeOfMap && !hit.entity.isAirtight()) return false

    let hasGapOnEdge = neighbors.find((otherHit) => {
      if (!otherHit) return true
      return !otherHit.entity
    })

    if (hasGapOnEdge) return hasGapOnEdge

    return hit.entity.isAirtight()
  }

  canBelongToMultipleNetworks(hit) {
    return hit.entity.hasCategory("door") ||
           hit.entity.hasCategory("vent") ||
           hit.entity.hasCategory("wall")
  }

  updateRoomTree() {
    for (let roomId in this.rooms) {
      let room = this.rooms[roomId]
      try {
        room.updateSpatialTree()
      } catch(e) {
        this.game.captureException(e)
      }
    }
  }

  executeTurn() {
    const isOneSecondInterval = this.container.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    for (let roomId in this.rooms) {
      let room = this.rooms[roomId]
      // single point of failure
      this.safeExecuteTurn(room)
    }
  }

  safeExecuteTurn(entity) {
    try {
      entity.executeTurn()
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  get rooms() {
    return this.networks
  }

  getRoomCount() {
    return this.getNetworkCount()
  }

  getRandomRoom() {
    let keys = Object.keys(this.rooms)
    let index = Math.floor(Math.random() * keys.length)
    let key = keys[index]
    return rooms[key]
  }

  setPlatformGrids(grids) {
    this.platformGrids = grids
  }

  getPlatform(row, col) {
    let platform

    for (var i = 0; i < this.platformGrids.length; i++) {
      let grid = this.platformGrids[i]
      let entity = grid.get(row, col)
      if (entity) {
        platform = entity
        break
      }
    }

    return platform
  }

  isSameRooms(rooms, otherRooms) {
    let roomIds = rooms.map((room) => { return room.id }).sort((a, b) => { return a - b}).join(",")
    let otherRoomIds = otherRooms.map((room) => { return room.id }).sort((a, b) => { return a - b}).join(",")

    return roomIds === otherRoomIds
  }

  getRooms(entity) {
    if (entity.rooms) {
      return Object.values(entity.rooms)
    } else if (entity.room) {
      return [entity.room]
    } else {
      return []
    }
  }

  findNeighborPartitionRequests(options) {
    // check if a neighbor is already being partitioned
    let neighbors = this.getNeighbors(options)

    let requests = neighbors.map((neighbor) => {
      if (!neighbor) return null
      if (!neighbor.entity) return null
      return this.partitionRequestsByTile[neighbor.entity.getId()]
    }).filter((partitionRequest) => {
      return partitionRequest
    })

    return [...new Set(requests)] // only unique ones
  }

  createNewNetworkFor(hit) {
    let room = super.createNewNetworkFor(hit)
    debug("[fresh] created new room network: " + room.id)
    this.onRoomNeeded(room)
  }

  partition(options) {
    if (this.isAllocationDisabled) return
      
    let request = new RoomPartitionRequest(this, options)

    this.partitionRequestsByTile[options.entity.getId()] = request
    this.partitionRequests[request.getId()] = request
  }

  untrackPartitionRequest(partitionRequest) {
    delete this.partitionRequests[partitionRequest.getId()]

    partitionRequest.getSourceTiles().forEach((hit) => {
      delete this.partitionRequestsByTile[hit.entity.getId()]
    })
  }

  shouldStartFloodFill(frontier) {
    // only if there's no room assigned. or if room assigned but no
    return true
  }

  shouldStopFloodFill(hit, neighbors) {
    return !hit.entity || hit.entity.isAirtight()
  }

  getNetworkName() {
    return "room"
  }

  getNetworkCollection() {
    return "rooms"
  }

  setAllocationDisabled(bool) {
    this.isAllocationDisabled = bool
  }

  allocateRooms(platforms) {
    for (var i = 0; i < platforms.length; i++) {
      let platform = platforms[i]

      let entity = this.getTile(platform.getRow(), platform.getCol())
      if (entity.hasCategory("platform") && !platform.room) {
        let room = new Room(this)
        this.assignNetworks({ row: platform.getRow(), col: platform.getCol() }, room)
        this.onRoomNeeded(room)
      }
    }
  }

  allocateRoomsForLand(land) {
    land.tiles.forEach((coord) => {
      let coords = coord.split("-")
      let row = parseInt(coords[0])
      let col = parseInt(coords[1])

      let entity = this.getTile(row, col)
      let isWalkable = entity.isGroundTile() || entity.isUndergroundTile()
      if (isWalkable && !entity.room) {
        let room = new Room(this)
        this.assignNetworks({ row: row, col: col }, room)
        this.onRoomNeeded(room)
      }
    })
  }

  allocateNetwork(options) {
    if (this.isAllocationDisabled) return

    debug("allocateNetwork: " + [options.row,options.col,options.entity.constructor.name].join("-"))
    const hit = options
    const neighbors = this.getNeighbors(options)
    const availableNetworks = this.getAvailableNetworks(neighbors)
    const neighborWithPartitionRequest = neighbors.find((neighbor) => {
      if (!neighbor) return
      if (!neighbor.entity) return
      return this.partitionRequestsByTile[neighbor.entity.getId()]
    })

    const isRoomPartitioner = options.entity.isRoomPartitioner()
    const noSpaceLeft = neighbors.every((neighbor) => {
      if (!neighbor) return true
      if (!neighbor.entity) return true
      return neighbor.entity.isRoomPartitioner()
    })

    if (isRoomPartitioner && noSpaceLeft) {
      let room = hit.entity.getStandingPlatform() && hit.entity.getStandingPlatform().room
      if (room) {
        this.onRoomStale(room)
      }
    } else if (options.entity.isStructure() && !isRoomPartitioner) {
      let hits = options.entity.getHits()
      hits.forEach((hit) => {
        this.allocateStructureToNetwork(hit)
      })
    } else if (isRoomPartitioner || neighborWithPartitionRequest || availableNetworks.length > 1) {
      let partitionRequest = neighborWithPartitionRequest ? this.partitionRequestsByTile[neighborWithPartitionRequest.entity.getId()] : null
      if (partitionRequest) {
        debug("merging: " + [hit.row, hit.col].join("-") + " with partitionRequest: " + partitionRequest.id)
        partitionRequest.addSourceTile(options)
        partitionRequest.touchActivity()
      } else {
        debug("merging: " + [hit.row, hit.col].join("-"))
        this.partition(options)
      }
    } else if (availableNetworks.length === 1) {
      let targetNetwork = availableNetworks[0]
      debug("assigning: " + [hit.row, hit.col, options.entity.constructor.name].join("-") + " to network " + targetNetwork.id)
      this.joinExistingNetwork(hit, targetNetwork, neighbors)
    } else {
      this.createNewNetworkFor(hit)
    }
  }

  joinExistingNetwork(hit, targetNetwork, neighbors) {
    this.assignNetwork(hit, targetNetwork, neighbors)
    this.reallocateNeighborsToTileGroup(targetNetwork, neighbors)
  }

  allocateStructureToNetwork(hit) {
    debug("allocateStructure: " + [hit.row, hit.col, hit.entity.constructor.name].join("-"))
    for (let i = 0; i < this.platformGrids.length; i++) {
      let grid = this.platformGrids[i]
      let entity = grid.get(hit.row, hit.col)
      if (entity) {
        let network = entity[this.getNetworkName()]
        if (network) {
          let neighbors = this.getNeighbors(hit)
          debug("allocateStructurePlatform: " + [hit.row, hit.col].join("-") + " to network " + network.id)
          this.assignNetwork(hit, network, neighbors)
          this.assignNetworkToEntity(hit, network)
          break
        }
      }
    }
  }

  addEntityToNetwork(hit, network, neighbors) {
    if (!hit.entity) return
      
    if (hit.entity.isStructure()) {
      network.addStructure(hit)
    }

    if (hit.entity.hasCategory("door")) {
      network.addDoor(hit)
    } else if (hit.entity.hasCategory("oxygen_storage")) {
      network.addOxygenStorage(hit)
    } else if (hit.entity.hasCategory("vent")) {
      network.addVent(hit)
    } else if (hit.entity.hasCategory("air_detector")) {
      network.addAirDetector(hit)
    }

    if (this.isNetworkEdge(hit, neighbors)) {
      network.addEdgeTile(hit, neighbors)
    } else {
      this.addTile(network, hit)
    }
  }

  reallocateNeighborsToTileGroup(network, neighbors) {
    neighbors = neighbors || []

    neighbors.forEach((hit) => {
      let wasEdgeTile = network.isEdgeTile(hit)
      if (wasEdgeTile) {
        // check if its still edge
        let hitNeighbors = this.getNeighbors({ row: hit.row, col: hit.col, rowCount: 1, colCount: 1 })
        let isNetworkEdge = this.isNetworkEdge(hit, hitNeighbors)
        if (!isNetworkEdge) {
          // no longer edge
          network.transferEdgeToNonEdge(hit)
        }
      }
    })
  }

  assignNetwork(hit, network, neighbors, options = {}) {
    if (!hit.entity) return
      
    this.addEntityToNetwork(hit, network, neighbors)

    // if assignment came from floodFill. dont assign room to entity yet
    // as we dont know whether room floodfilled is to be created or abandoned.
    // we only do that after onCreateSuccess
    if (!options.isFloodFill) {
      network.assignNetworkToEntity(hit, network)
      network.finalizeRoomAssignment(hit)
    }

    return network
  }

  setOnRoomCreateSuccessListener(listener) {
    this.onRoomCreateSuccessListener = listener
  }

  addTile(network, hit) {
    if (hit.entity.isStructure()) {
      // check ground
      let platform = this.container.platformMap.get(hit.row, hit.col)
      if (platform) {
        let platformHit = { row: hit.row, col: hit.col, entity: platform }
        network.addTile(platformHit)
      } else {
        let ground = this.container.groundMap.get(hit.row, hit.col)
        if (ground) {
          let groundHit = { row: hit.row, col: hit.col, entity: ground }
          network.addTile(groundHit)
        }
      }
    } else {
      network.addTile(hit)
    }
  }

  isNetworkMember(entity) {
    return entity
  }

  getFirstRoom() {
    let key = Object.keys(this.networks)[0]
    return this.networks[key]
  }

}


module.exports = RoomManager
