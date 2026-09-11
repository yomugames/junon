const EnergySword = require("./energy_sword")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class FusionSword extends EnergySword {

  getSpritePath() {
    return 'fusion_sword.png'
  }

  getType() {
    return Protocol.definition().BuildingType.FusionSword
  }

  getConstantsTable() {
    return "Equipments.FusionSword"
  }

}

module.exports = FusionSword
