const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PlasmaBlade extends MeleeEquipment {

  getSpritePath() {
    return 'plasma_blade.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaBlade
  }

  getConstantsTable() {
    return "Equipments.PlasmaBlade"
  }

}

module.exports = PlasmaBlade
