const PowerNetwork = require("./power_network")
const Constants = require('../../../common/constants.json')
const NetworkManager = require("./network_manager")

class PowerManager extends NetworkManager {
  getNetworkKlass() {
    return PowerNetwork
  }

  getNetworkName() {
    return "powerNetwork"
  }

  setStructureGrid(grid) {
    this.structureGrid = grid
  }

  hasPowerRole(entity) {
    return entity.hasPowerRole()
  }

  getNeighbors(options) {
    const hits = this.getSideHitsFor(options)

    hits.forEach((hit) => {
      if (hit.entity && !this.isNetworkMember(hit.entity)) {
        hit.entity = null
      }
    })

    return hits
  }

  hasNetworkAssignment(hit) {
    let network = hit.entity[this.getNetworkName()]
    return network && network.hasHit(hit)
  }

  isNetworkMember(entity) {
    return entity && this.hasPowerRole(entity)
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("power_conduit")) {
      network.addConduit(hit)
    } else if (hit.entity.hasCategory("power_consumer")) {
      network.addConsumer(hit)
    } else {
      if (hit.entity.hasCategory("power_producer")) {
        network.addProducer(hit)
      }

      if (hit.entity.hasCategory("power_storage")) {
        network.addStorage(hit)
      }
    } 
  }

}


module.exports = PowerManager