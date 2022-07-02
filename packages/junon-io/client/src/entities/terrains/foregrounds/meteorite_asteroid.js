const Asteroid = require("./asteroid")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class MeteoriteAsteroid extends Asteroid {
  static getTextureMapping() {
    return {
      line_zero: PIXI.utils.TextureCache["meteorite_asteroid_0_ridge.png"],
      line_one: PIXI.utils.TextureCache["meteorite_asteroid_1_ridge.png"],
      line_two: PIXI.utils.TextureCache["meteorite_asteroid_2_ridge.png"],
      line_two_straight: PIXI.utils.TextureCache["meteorite_asteroid_2_straight_ridge.png"],
      line_three: PIXI.utils.TextureCache["meteorite_asteroid_3_ridge.png"],
      line_four: PIXI.utils.TextureCache["meteorite_asteroid_4_ridge.png"]
    }
  }

  getSpritePath() {
    return "meteorite_asteroid_2_ridge.png"
  }

  getOreSpritePath() {
    return "meteorite.png"
  }

  getType() {
    return Protocol.definition().TerrainType.MeteoriteAsteroid
  }

  getConstantsTable() {
    return "Terrains.MeteoriteAsteroid"
  }

  getShadowColor() {
    return "#ffffff" // no shadows
  }

  drawMinimap() {
  }

  undrawMinimap() {
  }
}

module.exports = MeteoriteAsteroid
