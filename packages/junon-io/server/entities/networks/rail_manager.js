const NetworkManager = require("./network_manager")
const RailNetwork = require("./rail_network")

class RailManager extends NetworkManager {
  constructor(container) {
    super(container)

    this.setGrids([this.container.railMap, this.container.structureMap])
  }

  getNetworkName() {
    return "railNetwork"
  }

  getNetworkKlass() {
    return RailNetwork
  }

  hasRole(entity) {
    return entity.hasRailRole()
  }

  isNetworkMember(entity) {
    return entity && this.hasRole(entity)
  }

  addEntityToNetwork(hit, network) {
    if (hit.entity.hasCategory("rail_stop")) {
      network.addRailStop(hit)
    } else if (hit.entity.hasCategory("rail_track")) {
      network.addRailTrack(hit)
    }
  }


}

module.exports = RailManager