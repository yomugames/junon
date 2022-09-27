const HoverMob = require("./hover_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Raven extends HoverMob {
  getType() {
    return Protocol.definition().MobType.Raven
  }

  getConstantsTable() {
    return "Mobs.Raven"
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

    let angleDiffInRad = 30 * Math.PI / 180
    let firstSourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize * 2, this.getAbsoluteRadAngle() - angleDiffInRad)
    let secondSourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize * 2, this.getAbsoluteRadAngle() + angleDiffInRad)

    let points = [firstSourcePoint, secondSourcePoint]

    points.forEach((sourcePoint) => {
        new Projectiles.Missile({
            weapon:        this,
            destinationEntity:  attackTarget,
            source:      { x: sourcePoint[0],         y: sourcePoint[1] },
            destination: { x: attackTarget.getX(),    y: attackTarget.getY() },
            ignoreObstacles: true,
            shouldCreateExplosion: true,
            shouldAttackBuildings: true
        })
    })

  }


}

module.exports = Raven
