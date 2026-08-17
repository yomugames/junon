const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PlasmaSabre extends MeleeEquipment {

  getSpritePath() {
    return 'plasma_sabre.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaSabre
  }

  getConstantsTable() {
    return "Equipments.PlasmaSabre"
  }

}

module.exports = PlasmaSabre
