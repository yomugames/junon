const Network = require("./network")

class PressureNetwork extends Network {

  constructor(manager) {
    super(manager)

    this.game = manager.game
    this.container = manager.container
    this.manager = manager
  }

  initMembers() {
    this.rooms = {}
    this.vacuums = {}
  }

  addRoom(room) {
    this.rooms[room.getId()] = room

    this.onRoomAdded(room)
  }

  removeRoom(room) {
    delete this.rooms[room.getId()] 
  }

  removeMember(room) {
    this.removeRoom(room)
  }

  onRoomAdded(room) {

  }

  reset() {
    for (let id in this.rooms) {
      let room = this.rooms[id]
      this.unassignNetworkFromEntity({ room: room }, this)
    }

    this.rooms = {}
  }

  unassignNetworkFromEntity(options, network) {
    this.manager.unassignNetworkFromEntity(options, network)
    this.onNetworkUnassigned(options)
  }

  onNetworkUnassigned(options) {

  }

  hasPressure() {
    let hasVacuum = false

    for (let roomId in this.rooms) {
      let room = this.rooms[roomId]
      if (!room.isAirtightAndSealed()) {
        hasVacuum = true
        break
      }
    }

    return !hasVacuum
  }

  forEachRoom(cb) {
    for (let id in this.rooms) {
      cb(this.rooms[id])
    }
  }

  calculateOxygenatedCombinedNetwork() {
    let result = false

    for (let id in this.rooms) {
      let room = this.rooms[id]
      if (room.hasOxygenatedNetwork()) {
        result = true
        break
      }
    }

    return result
  }

  toDebugJson() {
    let result = {}

    result.pressureNetworkId = this.id
    result.rooms = Object.keys(this.rooms)
    result.leaks = []

    this.forEachRoom((room) => {
      if (!room.isAirtightAndSealed()) {
        result.leaks.push("Room " + room.id)
      }
    })

    return result
  }

}

module.exports = PressureNetwork
