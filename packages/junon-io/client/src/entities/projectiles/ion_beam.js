const BaseBeam = require("./base_beam")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class IonBeam extends BaseBeam {

  constructor(game, data) {
    super(game, data)

    this.raySprite.alpha = 0.8
    this.headSprite.alpha = 0
  }

  getRayThickness() {
    return 32
  }

  getHeadWidth() {
    return 96
  }

  calculateBeamDistance() {
    return super.calculateBeamDistance() + 32 // a little bit longer
  }


  getSpriteContainer() {
    return this.game.backgroundSpriteContainer
  }

  calculateAngle(data) {
    return data.angle
  }

  // drawBeam() {
  //   const distance = Math.sqrt((this.destination.x - this.source.x) ** 2 + (this.destination.y - this.source.y) ** 2)
  //   this.w = distance

  //   this.instructToExpand(distance)
  //   this.instructToMove(this.source.x, this.source.y)
  // }

  getBaseSpritePath() {
    return 'ion_beam.png'
  }

  getHeadSpritePath() {
    return 'ion_beam_head.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.IonBeam
  }

  getConstantsTable() {
    return "Projectiles.IonBeam"
  }

}

module.exports = IonBeam
