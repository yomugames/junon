const LiquidNetwork = require("./liquid_network")
const OxygenManager = require("./oxygen_manager")

class LiquidManager extends OxygenManager {
  getNetworkKlass() {
    return LiquidNetwork
  }

  getNetworkName() {
    return "liquidNetwork"
  }

  hasRole(entity) {
    return entity.hasLiquidRole()
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("liquid_conduit")) {
      network.addConduit(hit)
    } else { 
      if (hit.entity.hasCategory("liquid_producer")) {
        network.addProducer(hit)
      } 

      if (hit.entity.hasCategory("liquid_storage")) {
        network.addStorage(hit)
      }
    }
  }



}

module.exports = LiquidManager