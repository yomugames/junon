const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")

class SecurityMonitor extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
  }

  getType() {
    return Protocol.definition().BuildingType.SecurityMonitor
  }

  getSpritePath() {
    return "security_monitor.png"
  }

  getConstantsTable() {
    return "Buildings.SecurityMonitor"
  }

}

module.exports = SecurityMonitor
