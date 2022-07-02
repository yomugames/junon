const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Katana extends MeleeEquipment {

  getSpritePath() {
    return 'katana.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Katana
  }

  getConstantsTable() {
    return "Equipments.Katana"
  }

}

module.exports = Katana
