const BaseFloor = require("./platforms/base_floor")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class WebTrap extends BaseFloor {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.WebTrap
  }

  getBaseSpritePath() {
    return "web_trap.png"
  }

  getSpritePath() {
    return "web_trap.png"
  }

  getConstantsTable() {
    return "Buildings.WebTrap"
  }

}

module.exports = WebTrap
