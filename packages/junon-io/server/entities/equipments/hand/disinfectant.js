const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class Disinfectant extends HandEquipment {
  use(player, targetEntity) {
    super.use(player, targetEntity)

    let distance = Constants.tileSize * 1.5

    let firstPoint  = player.game.pointFromDistance(player.getX(), player.getY(), distance, player.getRadAngle())

    let points = [firstPoint]

    let minWidth = Constants.Projectiles.DisinfectingGas.minWidth
    let maxWidth = Constants.Projectiles.DisinfectingGas.maxWidth

    points.forEach((point) => {
      const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth

      if (!this.isObstructed(player, point)) {
        Projectiles.DisinfectingGas.build({
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
    return Protocol.definition().BuildingType.Disinfectant
  }

  getConstantsTable() {
    return "Equipments.Disinfectant"
  }
}

module.exports = Disinfectant
