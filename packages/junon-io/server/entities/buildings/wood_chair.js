const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class WoodChair extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.WoodChair"
  }

  getType() {
    return Protocol.definition().BuildingType.WoodChair
  }

}

module.exports = WoodChair
