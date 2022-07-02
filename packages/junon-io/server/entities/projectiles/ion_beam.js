const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")
const p2 = require("p2")

class IonBeam extends HitscanProjectile {

  constructor(data) {
    super(data)
    this.angle = this.sourceEntity.getRotatedAngle()

    this.sourceEntityMoveListener = this.onSourceEntityMove.bind(this)
    this.destinationEntityMoveListener = this.onDestinationEntityMove.bind(this)

    this.sourceEntity.addMoveListener(this.sourceEntityMoveListener)
    this.destinationEntity.addMoveListener(this.destinationEntityMoveListener)
  }

  onSourceEntityMove(entity) {
    this.source.x = entity.getX()
    this.source.y = entity.getY()
    this.angle = this.sourceEntity.getRotatedAngle()

    this.onStateChanged()
  }

  onDestinationEntityMove(entity) {
    this.destination = this.sourceEntity.calculateDestination(entity)

    this.onStateChanged()
  }

  removeListeners() {
    this.sourceEntity.removeListener(this.sourceEntityMoveListener)
    this.destinationEntity.removeListener(this.destinationEntityMoveListener)
  }

  // positionBeam() {
  //   const midpoint = this.game.midpoint(this.source.x, this.source.y, this.destination.x, this.destination.y)
  //   this.body.position[0] = midpoint[0]
  //   this.body.position[1] = midpoint[1]
  // }

  getShape() {
    return new p2.Box({ width: this.getWidth(), height: this.getHeight() })
  }

  getType() {
    return Protocol.definition().ProjectileType.IonBeam
  }

  getConstantsTable() {
    return "Projectiles.IonBeam"
  }

  shouldRemoveImmediately() {
    return false
  }

  onCollide(entity) {
    // dont do anything
  }

}

module.exports = IonBeam
