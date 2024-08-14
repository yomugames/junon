const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class MiasmaGate extends BaseBuilding {

  getSpritePath() {
    return 'miasma_gate.png'
  }

  getType() {
    return Protocol.definition().BuildingType.MiasmaGate
  }

  getConstantsTable() {
    return "Buildings.MiasmaGate"
  }

}

module.exports = MiasmaGate
