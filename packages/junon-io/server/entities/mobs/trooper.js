const Guard = require("./guard")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Item = require("./../item")
const Projectiles = require('../projectiles/index')

class Trooper extends Guard {
  getConstantsTable() {
    return "Mobs.Trooper"
  }

  getType() {
    return Protocol.definition().MobType.Trooper
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

    const projectile = Projectiles.BasicLaser.build({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: this.getShootTarget(this),
      ignoreObstacles: false
    })

  }


}

module.exports = Trooper