const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Dirt extends BaseEffect {

  getConstantsTable() {
    return "Effects.Dirt"
  }

  onLevelChanged(level) {
    if (level <= 0) return

    let textures = ["dirt_1.png", "dirt_2.png", "dirt_3.png", "dirt_4.png"]
    let texture = textures[level - 1]

    this.sprite.texture = PIXI.utils.TextureCache[texture]
  }


}

module.exports = Dirt
