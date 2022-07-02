const Grenade = require("./grenade")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class PoisonGrenade extends Grenade {

  getType() {
    return Protocol.definition().ProjectileType.PoisonGrenade
  }

  getConstantsTable() {
    return "Projectiles.PoisonGrenade"
  }

  trigger() {
    this.createPoisonGas()
  }

  createPoisonGas() {
    let minWidth = Constants.Projectiles.PoisonGas.minWidth
    let maxWidth = Constants.Projectiles.PoisonGas.maxWidth

    let distance = Constants.tileSize
    let randomRadAngle = Math.floor(Math.random() * 360) * Math.PI / 180
    let stepRadAngle = 120 * Math.PI / 180
    let points = [
      this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, randomRadAngle + stepRadAngle),
      this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, randomRadAngle + stepRadAngle * 2),
      this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, randomRadAngle + stepRadAngle * 3)
    ]

    points.forEach((point) => {
      const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth

      this.sector.createProjectile("PoisonGas", {
        weapon: this,
        source:      { x: point[0], y: point[1] },
        destination: { x: point[0], y: point[1] },
        w: randomWidth,
        h: randomWidth
      })

    })
  }

}

module.exports = PoisonGrenade
