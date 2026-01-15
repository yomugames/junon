const HoverMob = require("./hover_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Pickup = require("./../pickup")

class SquidLord extends HoverMob {

  constructor(sector, data) {
    super(sector, data)

    this.MAX_BURST_COUNT = 8
    this.burstCount = 0
  }

  getType() {
    return Protocol.definition().MobType.SquidLord
  }

  getConstantsTable() {
    return "Mobs.SquidLord"
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

    if (this.burstCount === 0) {
      this.shouldShootProjectile = true
    }
  }

  resetBurstCount() {
    this.burstCount = 0
  }

  executeTurn() {
    if (!this.shouldShootProjectile) {
      super.executeTurn()
      return
    }

    if (this.burstCount >= this.MAX_BURST_COUNT) {
      this.shouldShootProjectile = false
      this.resetBurstCount()
      return
    }

    if (Math.random() < 0.5) return

    this.burstCount += 1

    let angleInRad = this.getAbsoluteRadAngle()
    let angleRandomizer = 20 - Math.floor(Math.random() * 40)
    angleInRad = angleInRad + (angleRandomizer * Math.PI / 180)

    let sourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, angleInRad)

    const projectile = Projectiles.Bubble.build({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: this.getShootTarget(this, this.getRadAngle(), Constants.tileSize * 20),
      ignoreObstacles: true
    })
  }

  remove() {
    super.remove()

    let dropPosition = { x: this.getX(), y: this.getY() }
    let drop = "SquidLordHeart"
    Pickup.createDrop({ sector: this.sector, x: dropPosition.x, y: dropPosition.y, type: drop, count: 1 })
  }

}

module.exports = SquidLord
