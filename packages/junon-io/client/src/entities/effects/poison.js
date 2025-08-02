const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")
const ClientHelper = require("./../../util/client_helper")

class Poison extends BaseEffect {

  getConstantsTable() {
    return "Effects.Poison"
  }

  getSprite() {
    return null
  }

  getTint() {
    return 0x00ff00
  }

  onPostInit() {
    this.affectedEntity.getTintableSprites().forEach((sprite) => {
      sprite.originalTint = sprite.tint ? sprite.tint : sprite.defaultTint
      sprite.tint = this.getTint()
    })
  }  

  remove() {
    super.remove()

    this.affectedEntity.getTintableSprites().forEach((sprite) => {
      if (sprite.originalTint) {
        sprite.tint = sprite.originalTint
      }
    })
  }

}

module.exports = Poison
