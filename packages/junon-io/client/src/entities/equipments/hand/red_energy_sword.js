const EnergySword = require("./energy_sword")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class RedEnergySword extends EnergySword {

  getSpritePath() {
    return 'red_energy_sword.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RedEnergySword
  }

  getConstantsTable() {
    return "Equipments.RedEnergySword"
  }

}

module.exports = RedEnergySword
