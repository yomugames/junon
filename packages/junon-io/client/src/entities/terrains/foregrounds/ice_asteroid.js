const Asteroid = require("./asteroid")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")


class IceAsteroid extends Asteroid {
  getSpritePath() {
    return "asteroid.png"
  }

  getSprite() {
    const sprite = super.getSprite()
    sprite.tint = 0x69dafe // ice blue
    return sprite
  }

  getType() {
    return Protocol.definition().TerrainType.IceAsteroid
  }

  getConstantsTable() {
    return "Terrains.IceAsteroid"
  }

}

module.exports = IceAsteroid
