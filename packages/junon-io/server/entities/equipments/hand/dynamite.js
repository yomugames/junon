const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class Dynamite extends HandEquipment {

  static use(user, targetEntity, options = {}) {
    let distanceFromUser = 0
    let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), distanceFromUser, user.getRadAngle())
    let destination = { x: options.targetX, y: options.targetY }
    // if distance exceeds limit
    let rangeLimit = this.prototype.getRange()
    let targetDistance = user.game.distance(sourcePoint[0], sourcePoint[1], destination.x, destination.y)
    if (targetDistance > rangeLimit) {
      destination = user.getShootTarget(this)
    }

    let damage = this.prototype.getEquipmentDamage() * user.getDamageMultiplier()

    let weapon = {
      owner: user,
      sector: user.sector,
      getDamage: () => { return damage },
      isBuilding: () => { return false }
    }

    const projectileKlass = this.getProjectileKlass()
    const projectile = new projectileKlass({
      weapon:        weapon,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: destination
    })

    return super.use(user, targetEntity, options)
  }

  isConsumable() {
    return true
  }

  getEquipmentDamage() {
    // if (this.game.isPvP()) {
    if (false) {
      return this.getConstants().stats.damage * 2
    } else {
      return this.getConstants().stats.damage
    }
  }


  static getProjectileKlass() {
    return Projectiles.Dynamite
  }

  getType() {
    return Protocol.definition().BuildingType.Dynamite
  }

  getConstantsTable() {
    return "Equipments.Dynamite"
  }
}

module.exports = Dynamite
