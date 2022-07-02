const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Tree extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.Tree
  }

  getSpritePath() {
    return "tree.png"
  }

  getConstantsTable() {
    return "Buildings.Tree"
  }

}

module.exports = Tree
