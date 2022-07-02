const BaseFloor = require("./platforms/base_floor")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SpikeTrap extends BaseFloor {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.SpikeTrap
  }

  getBaseSpritePath() {
    return "spike_trap.png"
  }

  getSpritePath() {
    return "spike_trap.png"
  }

  getConstantsTable() {
    return "Buildings.SpikeTrap"
  }

}

module.exports = SpikeTrap
