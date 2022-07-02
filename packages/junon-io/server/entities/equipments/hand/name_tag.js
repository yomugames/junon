const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class NameTag extends HandEquipment {

  static use(user, targetEntity, options = {}) {
    return false // clicking shouldnt consume. rather, only after clicks "SET"
                 // on change name menu
  }

  isConsumable() {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.NameTag
  }

  getConstantsTable() {
    return "Equipments.NameTag"
  }
}

module.exports = NameTag
