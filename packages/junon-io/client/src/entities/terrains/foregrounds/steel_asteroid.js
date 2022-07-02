const Asteroid = require("./asteroid")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class SteelAsteroid extends Asteroid {
  getSpritePath() {
    return "asteroid_texture.png"
  }

  getOreSpritePath() {
    return "steel_ore.png"
  }

  getSprite() {
    const sprite = super.getSprite()

    // sprite.tint = 0xd47c03 
    return sprite
  }

  getType() {
    return Protocol.definition().TerrainType.SteelAsteroid
  }

  getConstantsTable() {
    return "Terrains.SteelAsteroid"
  }

}

module.exports = SteelAsteroid
