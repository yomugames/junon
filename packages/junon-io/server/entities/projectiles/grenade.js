const BaseProjectile = require("./base_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Grenade extends BaseProjectile {

  constructor(data) {
    super(data)

    if (typeof data.countdown !== 'undefined') {
      this.countdown = data.countdown
    } else {
      this.countdown = 2
    }
  }

  getType() {
    return Protocol.definition().ProjectileType.Grenade
  }

  getConstantsTable() {
    return "Projectiles.Grenade"
  }

  onMoveComplete() {
    // already counting down
    if (this.startCountdownTimestamp) return

    this.body.velocity[0] = 0
    this.body.velocity[1] = 0
    this.setPosition(this.destination.x, this.destination.y)

    this.startCountdownTimestamp = this.game.timestamp
    this.sector.addProcessor(this)
  }

  move() {
    // already counting down
    if (this.startCountdownTimestamp) return

    super.move()
  }

  getCountdown() {
    return Constants.physicsTimeStep * this.countdown
  }

  executeTurn() {
    let timestampDuration = this.game.timestamp - this.startCountdownTimestamp
    let triggerTimestampDuration = this.getCountdown()
    if (timestampDuration < triggerTimestampDuration) return

    this.remove()
    this.trigger()
  }

  trigger() {
    const explosion = this.createExplosion()
  }

  createExplosion() {
    return this.sector.createProjectile("Explosion", {
      owner:       this.getOwner(),
      weapon:        this.weapon,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: this.getX(),         y: this.getY() }
    })
  }

  remove() {
    this.sector.removeProcessor(this)
    super.remove()
  }


}

module.exports = Grenade
