const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Sabre extends MeleeEquipment {

  getSpritePath() {
    return 'sabre.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Sabre
  }

  getConstantsTable() {
    return "Equipments.Sabre"
  }

}

module.exports = Sabre
