const Constants = require("../constants.json")
const vec2 = require("./../util/vec2")

const ShipMountable = () => {
}

ShipMountable.prototype = {
  becomePilot(ship) {
    this.isPilot = true
    this.ship = ship
  },
  unmountPilot() {
    this.isPilot = false
    this.ship = null
  },

  // https://math.stackexchange.com/questions/270194/how-to-find-the-vertices-angle-after-rotation
  getAbsoluteXOnContainer() {
    const x     = this.getContainer().getGridRulerTopLeft().x + this.getRelativeX()
    const y     = this.getContainer().getGridRulerTopLeft().y + this.getRelativeY()
    const p     = this.getContainer().getX()
    const q     = this.getContainer().getY()
    const radian = this.getContainer().getRadAngle()
    const rotatedX = (x-p) * Math.cos(radian) - (y-q) * Math.sin(radian) + p

    return rotatedX
  },

  getAbsoluteYOnContainer() {
    const x     = this.getContainer().getGridRulerTopLeft().x + this.getRelativeX()
    const y     = this.getContainer().getGridRulerTopLeft().y + this.getRelativeY()
    const p     = this.getContainer().getX()
    const q     = this.getContainer().getY()
    const radian = this.getContainer().getRadAngle()
    const rotatedY = (x-p) * Math.sin(radian) + (y-q) * Math.cos(radian) + q

    return rotatedY
  },

  getRelativeX() {
    throw new Error("Must implement ShipMountable#getRelativeX")
  },

  getRelativeY() {
    throw new Error("Must implement ShipMountable#getRelativeY")
  }
}

module.exports = ShipMountable


