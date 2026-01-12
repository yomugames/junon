const Guard = require("./guard")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Item = require("./../item")
const Projectiles = require('../projectiles/index')

class Sapper extends Guard {
  getConstantsTable() {
    return "Mobs.Sapper"
  }

  getType() {
    return Protocol.definition().MobType.Sapper
  }

  initWeapon() {
    // this.handEquipItem = new Item(this, "Pistol")
    // this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, this.handEquipItem)
  }

  getRange() {
    return this.getAttackRange()
  }

  performAttack(attackTarget) {
    let radian = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let deg = Math.floor(radian * (180 / Math.PI))
    this.setAngle(deg)

    let sourcePoint = [this.getX(), this.getY()]

    const projectile = Projectiles.BlueLaser.build({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: this.getShootTarget(this),
      ignoreObstacles: false
    })
  }

  canDamage(target, checkTrap = true, allowWall = true) {
    if (target.isMob()) return false
    if (this.isFriendlyUnit(target)) return false
    if (target.hasCategory("ghost")) return false

    if (target.storage && target.storage.getType && target.storage.getType() === Protocol.definition().BuildingType.CryoTube) {
      return false
    }

    if (target.isPlayer()) {
      return false
    }

    if (target.hasCategory("wall")) {
        return true
    }


    if (target.hasCategory("trap")) {
        return false
    }

    if (target.hasCategory("crop")) {
      return false
    }

    if (target.hasCategory("door")) {
      return true
    }

    if (target.hasCategory("distribution") ||
        target.hasCategory("platform") ||
        target.hasCategory("terrain") ||
        target.hasCategory("walkable") ||
        target.hasCategory("rail") ||
        target.hasCategory("sign") ||
        target.hasCategory("vent")) {
      return false
    }

    return true
  }
}

module.exports = Sapper