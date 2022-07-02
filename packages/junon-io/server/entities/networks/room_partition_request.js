const Room = require("./room")
const Constants = require('../../../common/constants.json')
const Helper = require('../../../common/helper')
const ExceptionReporter = require("junon-common/exception_reporter")
const debug = require('debug')('room')

class RoomPartitionRequest {
  constructor(manager, options) {
    this.requestedAt = Date.now()

    this.manager = manager
    this.game = this.manager.game

    this.id = manager.game.generateId("room_partition_request")
    this.coord = [options.row, options.col].join("-")
    debug("new partitionRequest: " + this.id + " " + this.coord)

    this.options = options

    this.neighborIndex = 0

    this.rooms = {}
    this.sourceTiles = {}
    this.addSourceTile(options)

    this.resetAssignments()

    this.touchActivity()
  }

  getId() {
    return this.id
  }

  isReady() {
    let seconds = 1
    let ticksDelay = Constants.physicsTimeStep * seconds

    return this.getGame().timestamp - this.timestamp > ticksDelay
  }

  addSourceTile(hit) {
    this.sourceTiles[hit.entity.getId()] = hit
  }

  getSourceTiles() {
    return Object.values(this.sourceTiles)
  }

  getGame() {
    return this.manager.container.game
  }

  touchActivity() {
    this.timestamp = this.getGame().timestamp
  }

  getGroupKey() {
    return this.getRoom() || this.getLand()
  }

  getLand() {
    return this.options.entity.getLand()
  }

  getRoom() {
    return this.options.entity.getRoom()
  }

  getEntity() {
    return this.options.entity
  }

  findRoomsVisited() {
    let rooms = {}

    // look at target
    let room = this.options.entity.room
    if (room) {
      rooms[room.id] = room
    } else {
      let row = this.options.row
      let col = this.options.col
      let platform = this.manager.getPlatform(row, col)
      if (platform && platform.room) {
        rooms[platform.room.id] = platform.room
      }
    }

    // look at assignments
    for (let tileKey in this.assignments) {
      let assignment = this.assignments[tileKey]
      let entity = assignment.entity

      let room = entity && entity.room
      if (room) {
        rooms[room.id] = room
      } else {
        let rowCol = Helper.getRowColFromCoord(tileKey)
        let platform = this.manager.getPlatform(rowCol[0], rowCol[1])
        if (platform && platform.room) {
          rooms[platform.room.id] = platform.room
        }
      }
    }

    return Object.values(rooms)
  }

  getNeighbors() {
    return this.getSourceTiles().map((hit) => {
      return this.manager.getNonEmptyNeighbors(hit)
    }).flat()
  }

  resetAssignments() {
    this.assignments = {}
  }

  performAsync() {
    this.isInProgress = true

    // get neighbors of all source tiles
    this.neighbors = this.getNeighbors()

    this.allocateRoomToNeighbors()
  }

  isProgressing() {
    return this.isInProgress
  }

  cancel() {
    this.floodFillRequest.cancel()
    this.floodFillRequest = null
  }

  allocateRoomToNeighbors() {
    try {
      debug(this.getName() + " allocateRoomToNeighbors " + this.neighborIndex)
      let neighbor = this.neighbors[this.neighborIndex]

      if (this.neighborIndex >= this.neighbors.length) {
        this.onPartitionComplete()
      } else {
        this.floodFillTile(neighbor)
      }
    } catch(e) {
      this.game.captureException(e)
      this.failed = true
    }
  }

  onComplete(listener) {
    this.onCompleteListener = listener
  }

  onPartitionComplete() {
    this.floodFillRequest = null

    try {
      this.determineIfNewRoomNeeded()
      if (this.onCompleteListener) {
        this.onCompleteListener()
      }
    } catch(e) {
      this.game.captureException(e)
      this.failed = true
    }

    this.isComplete = true
  }

  isCompletedOrCanceled() {
    if (this.failed) return true
    // let maxPartitionTime = 10 * Constants.physicsTimeStep // 10 sec
    // if (this.getGame().timestamp - this.timestamp > maxPartitionTime) {
    //   return true
    // }

    return this.isComplete
  }

  shouldStart(targetHit) {
    return true
  }

  isRoomFillable(hit) {
    return !this.isSeparator(hit) && !this.hasRoomAssignment(hit)
  }

  registerAssignment(visitedHit, room) {
    let tileKey = this.getTileKey(visitedHit)
    this.assignments[tileKey] = { room: room, entity: visitedHit.entity }
  }

  getTileKey(hit) {
    return hit.row + "-" + hit.col
  }

  floodFillTile(hit) {
    if (this.isFloodFillInProgress) return

    if (this.isRoomFillable(hit)) {
      // for (let id in this.rooms) {
      //   let existingRoom = this.rooms[id]
      //   if (existingRoom.hasTile(hit)) {
      //   }
      // }

      // console.log([hit.row, hit.col, hit.entity.constructor.name].join(",") + " new Room ????")

      let room = new Room(this.manager) // create new room

      // console.log(this.getName() + " requestRoom " + room.getId() + " FloodFill @ " + [hit.row, hit.col].join(" ") + " type: " + hit.entity.getName())
      this.floodFillRequest = this.manager.floodFillManager.requestFloodFill(hit.row, hit.col, { caller: this })
      this.isFloodFillInProgress = true

      this.floodFillRequest.onUpdate((visitedHit, neighbors) => {
        this.registerAssignment(visitedHit, room)
        this.manager.assignNetwork(visitedHit, room, neighbors, { isFloodFill: true })
      })

      this.floodFillRequest.onComplete(this.onFloodFillComplete.bind(this, room))
      this.floodFillRequest.onHalt(this.onFloodFillHalt.bind(this))
    } else {
      this.neighborIndex += 1
      this.allocateRoomToNeighbors()
    }
  }

  onFloodFillHalt(originHit) {
    this.isFloodFillInProgress = false

    let room = originHit.entity.room

    if (room) {
      debug(this.getName() + " FloodFill skipped: " + originHit.entity.getName() + " " + [originHit.row, originHit.col].join(",") + " has been assigned to room: " +  room.getId())
      // target already has updated room. use it instead
      this.rooms[room.id] = room

    } else {
      debug(this.getName() + " FloodFill skipped: " + originHit.entity.getName() + " " + [originHit.row, originHit.col].join(",") + " due to no longer roomFillable " )
    }

    this.neighborIndex += 1
    this.allocateRoomToNeighbors()
  }

  onFloodFillComplete(room, hit) {
    this.isFloodFillInProgress = false

    // if (room.isAirtight()) {
    // } else {
    //   room.reset()
    // }

    debug(this.getName() + " floodFillComplete for room " + room.getId()  + " @ " + [hit.row, hit.col].join(" "))
    debug(this.getName() + " === potential room: " + room.getId())
    this.rooms[room.id] = room

    this.neighborIndex += 1
    this.allocateRoomToNeighbors()
  }

  getName() {
    return "RoomPartitionRequest " + this.id
  }


  hasRoomAssignment(hit) {
    let tileKey = this.getTileKey(hit)
    return this.assignments[tileKey]
  }

  isSeparator(hit) {
    return hit.entity.isRoomPartitioner()
  }

  determineIfNewRoomNeeded() {
    debug("== " + this.id + " determine if new room needed")

    let prevRooms = this.findRoomsVisited()
    let currRooms = Object.values(this.rooms)

    let roomsToDelete = prevRooms.filter((room) => { return currRooms.indexOf(room) === -1 })
    let roomsToAdd    = currRooms.filter((room) => { return prevRooms.indexOf(room) === -1 })

    debug("prev rooms: " + prevRooms.map((r) => { return r.id }).join(","))

    if (roomsToDelete.length > 0 || roomsToAdd.length > 0) {
      debug("deleting old rooms: " + roomsToDelete.map((r) => { return r.id }).join(","))
      roomsToDelete.forEach((room) => {
        this.manager.onRoomStale(room)
      })

      debug("adding new rooms: " + roomsToAdd.map((r) => { return r.id }).join(","))
      roomsToAdd.forEach((room) => {
        this.manager.onRoomNeeded(room)
      })

    } else {
      // airlocks for instance when replacing walled room, need to be registered to old room
      if (this.options.entity && !this.options.entity.isRemoved) {
        let hit = this.options
        prevRooms.forEach((room) => {
          this.manager.onRoomEntityAdded(hit, room, this.neighbors)
        })
      }
    }

    // let roomManager = this.manager
    // let roomList = Object.values(roomManager.rooms)
    // roomList.forEach((room) => {
    //   for (let roomId in roomManager.rooms) {
    //     let otherRoom = roomManager.rooms[roomId]
    //     if (room.id !== otherRoom.id && room.overlaps(otherRoom)) {
    //     }
    //   }
    // })

  }

}

module.exports = RoomPartitionRequest
