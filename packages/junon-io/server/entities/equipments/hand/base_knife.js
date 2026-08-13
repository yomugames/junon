const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class BaseKnife extends MeleeEquipment {
  getEquipmentBackstabDamage() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.item.id] && typeof this.sector.entityCustomStats[this.item.id].backstabDamageMultiplier !== 'undefined') {
        return this.sector.entityCustomStats[this.item.id].backstabDamageMultiplier
      } else if (this.sector.itemCustomStats[this.type] && typeof this.sector.itemCustomStats[this.type].backstabDamageMultiplier !== 'undefined') {
        return this.sector.itemCustomStats[this.type].backstabDamageMultiplier
      }
    }

    return this.getConstants().stats.backstabDamageMultiplier
  }
  
  isKnife() {
    return true
  }
  
  onEquipmentConstructed() {
  }
}

module.exports = BaseKnife
