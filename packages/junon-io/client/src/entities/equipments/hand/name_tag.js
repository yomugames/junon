const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class NameTag extends MeleeEquipment {

  getSpritePath() {
    return 'name_tag.png'
  }

  getType() {
    return Protocol.definition().BuildingType.NameTag
  }

  getConstantsTable() {
    return "Equipments.NameTag"
  }

}

module.exports = NameTag
