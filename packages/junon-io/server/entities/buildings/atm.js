const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Atm extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()
  }

  getConstantsTable() {
    return "Buildings.Atm"
  }

  getType() {
    return Protocol.definition().BuildingType.Atm
  }

}

module.exports = Atm

