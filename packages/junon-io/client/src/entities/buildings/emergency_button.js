const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class EmergencyButton extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.EmergencyButton
  }

  getSpritePath() {
    return "emergency_button.png"
  }

  getConstantsTable() {
    return "Buildings.EmergencyButton"
  }

}

module.exports = EmergencyButton
