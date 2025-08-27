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
      if(sprite.tint !== 16739693) /*Player red from being attacked*/sprite.originalTint = sprite.tint ? sprite.tint : sprite.defaultTint
      else sprite.originalTint = sprite.defaultTint ? sprite.defaultTint : sprite.tint
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
