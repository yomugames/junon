const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Blood extends BaseEffect {

  getConstantsTable() {
    return "Effects.Blood"
  }

  onPostInit() {
    if (this.affectedEntity.isTerrain()) {
      this.sprite.position.set(this.affectedEntity.getX(), this.affectedEntity.getY())
    }
  }  

  onLevelChanged(level) {
    if (level <= 0) return

    let textures = ["blood_1.png", "blood_2.png", "blood_3.png"]
    let fullBloodTextures = ["blood_4.png", "blood_4_b.png", "blood_4_c.png"]
    let texture

    if (level === 4)  {
      let index = Math.floor(Math.random() * fullBloodTextures.length)
      texture = fullBloodTextures[index]
    } else {
      texture = textures[level - 1]
    }

    this.sprite.texture = PIXI.utils.TextureCache[texture]
  }


}

module.exports = Blood
