const MeleeEquipment = require("./melee_equipment")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class Bowl extends MeleeEquipment {

  getSpritePath() {
    return 'bowl_by_px.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Bowl
  }

  getConstantsTable() {
    return "Equipments.Bowl"
  }

}

module.exports = Bowl
