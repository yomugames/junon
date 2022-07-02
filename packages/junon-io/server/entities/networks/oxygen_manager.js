const OxygenNetwork = require("./oxygen_network")
const NetworkManager = require("./network_manager")

class OxygenManager extends NetworkManager {
  getNetworkKlass() {
    return OxygenNetwork
  }

  getNetworkName() {
    return "oxygenNetwork"
  }

  setStructureGrid(grid) {
    this.structureGrid = grid
  }

  hasRole(entity) {
    return entity.hasOxygenRole()
  }

  hasNetworkAssignment(hit) {
    let network = hit.entity[this.getNetworkName()]
    return network && network.hasHit(hit)
  }

  isNetworkMember(entity) {
    return entity && this.hasRole(entity)
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("oxygen_conduit")) {
      network.addConduit(hit)
    } else { 
      if (hit.entity.hasCategory("oxygen_producer")) {
        network.addProducer(hit)
      }
      
      if (hit.entity.hasCategory("oxygen_storage")) {
        network.addStorage(hit)
      }
    }
  }

}

module.exports = OxygenManager