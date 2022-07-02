const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class TiledFloor extends BaseFloor {

  getConstantsTable() {
    return "Floors.TiledFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.TiledFloor
  }

}

module.exports = TiledFloor
