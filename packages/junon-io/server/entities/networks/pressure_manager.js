const NetworkManager = require("./network_manager")
const PressureNetwork = require("./pressure_network")
const Constants = require('../../../common/constants.json')

class PressureManager extends NetworkManager {
  getNetworkKlass() {
    return PressureNetwork
  }

  getNetworkName() {
    return "pressureNetwork"
  }

  getNeighbors(options) {
    return options.room.getNeighborReachableRooms()
  }

  getNonEmptyNeighbors(options) {
    return this.getNeighbors(options)
  }

  resetNetworks(options, neighbors) {
    this.resetNetworkFor(options.room)

    neighbors.forEach((room) => {
      this.resetNetworkFor(room)
    })
  }

  partition(options) {
    if (this.isAllocationDisabled) return
      
    const neighbors = options.rooms
    this.resetNetworks(options, neighbors)

    neighbors.forEach((room) => {
      if (!this.hasNetworkAssignment(room)) {
        let klass = this.getNetworkKlass()
        let network = new klass(this) 

        this.assignNetworks(room, network)
        this.networks[network.id] = network
        this.onNetworkCreated()
      }
    })
  }

  hasNetworkAssignment(room) {
    return room[this.getNetworkName()]
  }

  assignNetworks(targetRoom, network) {
    this.floodFill(targetRoom, (room) => {
      this.assignNetwork({ room: room }, network)
    })

    return network 
  }

  floodFill(targetRoom, callback) {
    let visited = {}

    let frontier = [targetRoom]
    visited[targetRoom.getId()] = targetRoom

    let room

    while (frontier.length > 0) {
      room = frontier.shift()
      callback(room)

      let neighbors = room.getNeighborReachableRooms()
      neighbors.forEach((neighborRoom) => {
        if (!visited[neighborRoom.getId()]) {
          frontier.push(neighborRoom)
          visited[neighborRoom.getId()] = neighborRoom
        }
      })
    }

  }

  getAvailableNetworks(neighbors) {
    let networks = {}

    for (var i = 0; i < neighbors.length; i++) {
      let room = neighbors[i]
      let network = room[this.getNetworkName()]
      if (network) {
        networks[network.getId()] = network
      }
    }

    return Object.values(networks)
  }

  assignNetworkToEntity(options, network) {
    options.room.assignNetwork(this.getNetworkName(), network)
    network.onNetworkAssigned(options.room)
  }

  addEntityToNetwork(options, network) {
    network.addRoom(options.room)
  }

  unassignNetworkFromEntity(options, network) {
    options.room.unassignNetwork(this.getNetworkName(), network)
  }


}

module.exports = PressureManager