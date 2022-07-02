const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BaseStarter extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    this.sprite.rotation = Math.PI/2
  }

  getType() {
    return Protocol.definition().BuildingType.BaseStarter
  }

  getSpritePath() {
    return "base_starter.png"
  }

  getConstantsTable() {
    return "Buildings.BaseStarter"
  }

}

module.exports = BaseStarter
