const EnergySword = require("./energy_sword")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class GreenEnergySword extends EnergySword {

  getSpritePath() {
    return 'green_energy_sword.png'
  }

  getType() {
    return Protocol.definition().BuildingType.GreenEnergySword
  }

  getConstantsTable() {
    return "Equipments.GreenEnergySword"
  }

}

module.exports = GreenEnergySword
