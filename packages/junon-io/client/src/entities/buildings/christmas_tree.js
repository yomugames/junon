const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ChristmasTree extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.ChristmasTree
  }

  getSpritePath() {
    return "christmas_tree.png"
  }

  getConstantsTable() {
    return "Buildings.ChristmasTree"
  }

}

module.exports = ChristmasTree
