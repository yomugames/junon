const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class BaseKnife extends MeleeEquipment {
  isKnife() {
    return true
  }
  
  onEquipmentConstructed() {
  }
}

module.exports = BaseKnife
