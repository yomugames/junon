const NetworkManager = require("./network_manager")
const SoilNetwork = require("./soil_network")

class SoilManager extends NetworkManager {
  constructor(container) {
    super(container)

    this.setGrids([this.container.platformMap, this.container.structureMap])
  }

  getNetworkName() {
    return "soilNetwork"
  }

  getNetworkKlass() {
    return SoilNetwork
  }

  hasRole(entity) {
    return entity.hasSoilRole()
  }

  isNetworkMember(entity) {
    return entity && this.hasRole(entity)
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("soil")) {
      network.addTile(hit)
    } else { 
      if (hit.entity.hasCategory("farm_controller")) {
        network.addFarmController(hit)
      }
    }
  }



}

module.exports = SoilManager