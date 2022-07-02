const FuelNetwork = require("./fuel_network")
const LiquidManager = require("./liquid_manager")

class FuelManager extends LiquidManager {
  getNetworkKlass() {
    return FuelNetwork
  }

  getNetworkName() {
    return "fuelNetwork"
  }

  hasRole(entity) {
    return entity.hasFuelRole()
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("fuel_conduit")) {
      network.addConduit(hit)
    } else if (hit.entity.hasCategory("fuel_consumer")) {
      network.addConsumer(hit)
    } else { 
      if (hit.entity.hasCategory("fuel_producer")) {
        network.addProducer(hit)
      } 
    }
    
    if (hit.entity.hasCategory("fuel_storage")) {
      network.addStorage(hit)
    }
  }



}

module.exports = FuelManager