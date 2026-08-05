const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class BaseKnife extends MeleeEquipment {
  getDamage(targetEntity) {
    let damage = super.getDamage(targetEntity)
    
    if (!targetEntity) {
      return damage
    }
    
    const backstabDamage = this.getEquipmentBackstabDamage()
    
    const threshold = this.getConstants().stats.angleBackstabThreshold ?? 20
    
    const angle = this.owner.angle
    const enemyAngle = targetEntity.angle
    
    let diff = angle - enemyAngle
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    
    if (Math.abs(diff) < threshold && !targetEntity.isBuilding()) {
      damage = Math.floor(damage * backstabDamage)
    }
    
    return damage
  }
  
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
