const HoverMob = require("./hover_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Drone extends HoverMob {
  getType() {
    return Protocol.definition().MobType.Drone
  }

  getConstantsTable() {
    return "Mobs.Drone"
  }

  addMiasma() {
    // nope
  }

  shouldCreateDeadBody() {
    return false
  }

  performAttack(attackTarget) {
    let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
    if (this.game.normalizeAngleDeg(this.getAngle()) !== this.game.normalizeAngleDeg(absoluteDegTowardsAttackTarget)) {
      return
    }

    let sourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, this.getAbsoluteRadAngle())

    const projectile = new Projectiles.LightLaser({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: this.getShootTarget(this),
      ignoreObstacles: true
    })
  }


}

module.exports = Drone
