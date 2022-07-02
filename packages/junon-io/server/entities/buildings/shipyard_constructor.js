const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class ShipyardConstructor extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.ShipyardConstructor"
  }

  getType() {
    return Protocol.definition().BuildingType.ShipyardConstructor
  }

}

module.exports = ShipyardConstructor
