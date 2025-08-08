const BaseEquipment = require("./../base_equipment")
const Protocol = require('../../../../common/util/protocol')

class HandEquipment extends BaseEquipment {

  use(user, targetEntity, options = {}) {
    super.use(user, targetEntity, options)

    let shouldAnimate = true
    if (typeof options.shouldAnimate !== 'undefined') {
      shouldAnimate = options.shouldAnimate
    }

    if (this.isAnimatable() && shouldAnimate) {
      user.sendEquipmentAnimation()
    }

    return true
  }

  isObstructed(source, point) {
    let entityToIgnore = source
    let distance = this.game.distance(source.getX(), source.getY(), point[0], point[1]) 
    let hit = source.getContainer().raycast(source.getX(), source.getY(), point[0], point[1], distance, entityToIgnore)
    return hit
  }

  isMeleeEquipment() {
    return false
  }

  getRole() {
    return Protocol.definition().EquipmentRole.Hand
  }

  getDamage(targetEntity) {
  const customStats = this.sector.entityCustomStats[this.item.id];
  if (customStats && typeof customStats.damage !== 'undefined') {
    return customStats.damage;
  }
  return this.getEquipmentDamage() || 0;
}

  getEquipmentDamage() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.item.id]) {
        return this.sector.entityCustomStats[this.item.id].damage
      } else if (this.sector.itemCustomStats[this.type]) {
        return this.sector.itemCustomStats[this.type].damage
      }
    }

    return this.getConstants().stats.damage
  }

  static isUsable() {
    return true
  }

}

module.exports = HandEquipment
