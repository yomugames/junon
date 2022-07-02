const BaseProjectile = require("./base_projectile")

// doesnt do damage by itself, weapon creates the damage
class HitscanProjectile extends BaseProjectile {
  constructor(data) {
    super(data)

    this.endX = Math.round(this.destination.x)
    this.endY = Math.round(this.destination.y)
  }

  updateRbushCoords() {
    this.minX = Math.min(this.source.x, this.destination.x)
    this.minY = Math.min(this.source.y, this.destination.y)
    this.maxX = Math.max(this.source.x, this.destination.x)
    this.maxY = Math.max(this.source.y, this.destination.y)
  }

  shouldRemoveImmediately() {
    return true
  }

  onMoveComplete() {
    // dont do anything
  }

  getSpeed() {
    return 0
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }
  }

}

module.exports = HitscanProjectile

