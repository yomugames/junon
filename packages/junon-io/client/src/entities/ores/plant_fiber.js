const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PlantFiber extends BaseOre {

  getSpritePath() {
    return 'plant_fiber.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlantFiber
  }

  getConstantsTable() {
    return "Ores.PlantFiber"
  }

}

module.exports = PlantFiber
