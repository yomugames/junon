const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class FireExtinguisher extends HandEquipment {
  use(player, targetEntity) {
    super.use(player, targetEntity)

    let distance = Constants.tileSize

    let firstPoint  = player.game.pointFromDistance(player.getX(), player.getY(), distance * 1, player.getRadAngle())
    let secondPoint = player.game.pointFromDistance(player.getX(), player.getY(), distance * 2, player.getRadAngle())
    // let thirdPoint  = player.game.pointFromDistance(player.getX(), player.getY(), distance * 4, player.getRadAngle())

    let points = [firstPoint, secondPoint]

    let minWidth = Constants.Projectiles.CarbonGas.minWidth
    let maxWidth = Constants.Projectiles.CarbonGas.maxWidth

    points.forEach((point) => {
      const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth

      if (!this.isObstructed(player, point)) {
        new Projectiles.CarbonGas({
          weapon: this,
          source:      { x: point[0], y: point[1] },
          destination: { x: point[0], y: point[1] },
          w: randomWidth,
          h: randomWidth
        })
      }
    })

  }

  getType() {
    return Protocol.definition().BuildingType.FireExtinguisher
  }

  getConstantsTable() {
    return "Equipments.FireExtinguisher"
  }
}

module.exports = FireExtinguisher
