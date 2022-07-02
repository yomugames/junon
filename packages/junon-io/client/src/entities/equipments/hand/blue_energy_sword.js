const EnergySword = require("./energy_sword")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class BlueEnergySword extends EnergySword {

  getSpritePath() {
    return 'blue_energy_sword.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BlueEnergySword
  }

  getConstantsTable() {
    return "Equipments.BlueEnergySword"
  }

}

module.exports = BlueEnergySword
