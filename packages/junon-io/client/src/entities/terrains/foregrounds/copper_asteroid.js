const Asteroid = require("./asteroid")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CopperAsteroid extends Asteroid {
  static getTextureMapping() {
    return {
      line_zero: PIXI.utils.TextureCache["copper_asteroid_0_ridge.png"],
      line_one: PIXI.utils.TextureCache["copper_asteroid_1_ridge.png"],
      line_two: PIXI.utils.TextureCache["copper_asteroid_2_ridge.png"],
      line_two_straight: PIXI.utils.TextureCache["copper_asteroid_2_straight_ridge.png"],
      line_three: PIXI.utils.TextureCache["copper_asteroid_3_ridge.png"],
      line_four: PIXI.utils.TextureCache["copper_asteroid_4_ridge.png"]
    }
  }

  getSpritePath() {
    return "copper_asteroid_2_ridge.png"
  }

  getOreSpritePath() {
    return "copper_ore.png"
  }

  getType() {
    return Protocol.definition().TerrainType.CopperAsteroid
  }

  getConstantsTable() {
    return "Terrains.CopperAsteroid"
  }

}

module.exports = CopperAsteroid
