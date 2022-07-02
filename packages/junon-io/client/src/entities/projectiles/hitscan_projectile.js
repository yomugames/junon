const BaseProjectile  = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class HitscanProjectile extends BaseProjectile {
  constructor(game, data) {
    super(game, data)
    this.setData(data)
    this.animate()
  }

  setData(data) {
    this.source      = { x: data.x,    y: data.y    }
    this.destination = { x: data.endX, y: data.endY }

    let deg       = this.calculateAngle(data)

    this.setAngle(deg)
  }

  calculateAngle(data) {
    let radian =  Math.atan2(this.destination.y - this.source.y, this.destination.x - this.source.x)
    let deg = Math.floor(radian * (180 / Math.PI))
    return deg
  }

  syncWithServer(data) {
    // no syncing needed, since projectile only exist for 1 frame
  }

  animate() {
    throw new Error("must implement HitscanProjectile#animate")
  }

  interpolate(lastFrameTime) {
    // dont interpolate, we do instant animation
  }

}

module.exports = HitscanProjectile
