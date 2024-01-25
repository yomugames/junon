const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PointyStick extends MeleeEquipment {

  getSpritePath() {
    return 'pointy_stick.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PointyStick
  }

  getConstantsTable() {
    return "Equipments.PointyStick"
  }

}

module.exports = PointyStick
