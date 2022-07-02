const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Core = require("./core")

class BaseStarter extends BaseBuilding {

  onBuildingPlaced() {
// 
//     let data = this.data
//     data.type = Core.prototype.getType()
// 
//     new Core(data, this.container)
  }

  isCoordValid() {
    return false
  }

  onConstructionFinished() {
    // it will never be constructed as it'll be replaced with core.
    // so dont do anything
  }

  shouldNotifyRemoval() {
    return false
  }

  getConstantsTable() {
    return "Buildings.BaseStarter"
  }

  getType() {
    return Protocol.definition().BuildingType.BaseStarter
  }

}

module.exports = BaseStarter

