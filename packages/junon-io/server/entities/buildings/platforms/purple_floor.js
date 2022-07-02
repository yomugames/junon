const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")


class PurpleFloor extends BaseFloor {

  getConstantsTable() {
    return "Floors.PurpleFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleFloor
  }

}

module.exports = PurpleFloor
