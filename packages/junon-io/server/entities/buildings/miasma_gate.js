const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class MiasmaGate extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.MiasmaGate"
  }

  getType() {
    return Protocol.definition().BuildingType.MiasmaGate
  }
}

module.exports = MiasmaGate
