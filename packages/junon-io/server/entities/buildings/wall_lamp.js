const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const Lamp = require("./lamp")

class WallLamp extends Lamp {

  getConstantsTable() {
    return "Buildings.WallLamp"
  }

  getType() {
    return Protocol.definition().BuildingType.WallLamp
  }
  
}


module.exports = WallLamp

