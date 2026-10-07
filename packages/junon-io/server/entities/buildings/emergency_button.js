const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

// Calling meetings belonged to the removed Find the Imposter minigame; the
// building remains so saves that contain it still load.
class EmergencyButton extends BaseBuilding {
  interact(user) {
  }

  getConstantsTable() {
    return "Buildings.EmergencyButton"
  }

  getType() {
    return Protocol.definition().BuildingType.EmergencyButton
  }

}

module.exports = EmergencyButton
