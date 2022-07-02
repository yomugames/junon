const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class PlantFiber extends BaseOre {
  getConstantsTable() {
    return "Ores.PlantFiber"
  }

  getType() {
    return Protocol.definition().BuildingType.PlantFiber
  }
}

module.exports = PlantFiber
