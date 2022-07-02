const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class FlameThrower extends HandEquipment {
  use(player, targetEntity) {
    if (this.isDepleted() && !player.hasInfiniteAmmo()) {
      let owner = this.getOwner()
      if (owner.isPlayer()) {
        owner.showError("Needs Fuel")
      }

      return
    }

    super.use(player, targetEntity)

    let distance = Constants.tileSize

    let longestPoint = Math.floor(this.getRange() / Constants.tileSize) - 1
    longestPoint = Math.max(1, longestPoint)
    let distanceMultipliers = Array(longestPoint).fill().map((element, index) => index + 1)

    // let distanceMultipliers = [2, 3, 4, 5]
    let points = distanceMultipliers.map((multiplier) => {
      return player.game.pointFromDistance(player.getX(), player.getY(), distance * multiplier, player.getRadAngle())
    })

    let minWidth = Constants.Projectiles.Flame.minWidth
    let maxWidth = Constants.Projectiles.Flame.maxWidth

    for (var i = 0; i < points.length; i++) {
      let point = points[i]
      let width = Math.min(maxWidth, minWidth + (i * 6))

      if (!this.isObstructed(player, point)) {
        new Projectiles.Flame({
          weapon: this,
          source:      { x: point[0], y: point[1] },
          destination: { x: point[0], y: point[1] },
          w: width,
          h: width
        })
      }
    }

  }

  onEquipmentConstructed() {
    this.setUsage(0)
  }

  getType() {
    return Protocol.definition().BuildingType.FlameThrower
  }

  getConstantsTable() {
    return "Equipments.FlameThrower"
  }
}

module.exports = FlameThrower
