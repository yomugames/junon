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

  // Base NetworkManager#allocateNetwork only assigns the single room in
  // `options` to the resulting network (via the base, non-flood-filling
  // assignNetwork), whether that network is brand new or an existing neighbor
  // network being joined. That's correct for grid/tile-based networks, where
  // buildings are placed one tile at a time and neighbors get/keep their own
  // network independently. Rooms are different: opening a door can instantly
  // connect this room to other rooms that are *also* newly reachable through
  // it (e.g. a room several doors away that had no network of its own yet, or
  // a whole separate branch that only now became reachable) - those need to
  // join too, via the same flood-fill already used by partition() below,
  // otherwise they're left with no pressureNetwork at all.
  allocateNetwork(options) {
    if (this.isAllocationDisabled) return

    const neighbors = this.getNeighbors(options)
    const availableNetworks = this.getAvailableNetworks(neighbors)

    if (availableNetworks.length > 1) {
      this.merge(options)
    } else if (availableNetworks.length === 1) {
      this.assignNetworks(options.room, availableNetworks[0])
    } else {
      this.createNewNetworkFor(options)
    }
  }

  createNewNetworkFor(options) {
    let klass = this.getNetworkKlass()
    let newNetwork = new klass(this)

    this.assignNetworks(options.room, newNetwork)
    this.networks[newNetwork.id] = newNetwork
    this.onNetworkCreated()

    return newNetwork
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