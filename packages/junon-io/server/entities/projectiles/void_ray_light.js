const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class VoidRayLight extends HitscanProjectile {

  constructor(data) {
    super(data)

    this.sourceEntityMoveListener = this.onSourceEntityMove.bind(this)
    this.destinationEntityMoveListener = this.onDestinationEntityMove.bind(this)

    this.sourceEntity.addMoveListener(this.sourceEntityMoveListener)
    this.destinationEntity.addMoveListener(this.destinationEntityMoveListener)
  }

  onSourceEntityMove(entity) {
    this.source.x = entity.getX()
    this.source.y = entity.getY()

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

  getType() {
    return Protocol.definition().ProjectileType.VoidRayLight
  }

  shouldRemoveImmediately() {
    return false
  }

  getConstantsTable() {
    return "Projectiles.VoidRayLight"
  }

}

module.exports = VoidRayLight
