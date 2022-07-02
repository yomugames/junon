const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class MiningBeam extends HitscanProjectile {

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

  getType() {
    return Protocol.definition().ProjectileType.MiningBeam
  }

  remove() {
    super.remove()
  }

  removeListeners() {
    this.sourceEntity.removeListener(this.sourceEntityMoveListener)
    this.destinationEntity.removeListener(this.destinationEntityMoveListener)
  }

  shouldRemoveImmediately() {
    return false
  }

  getConstantsTable() {
    return "Projectiles.MiningBeam"
  }

}

module.exports = MiningBeam
