const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Lighter extends MeleeEquipment {

  getSpritePath() {
    return 'lighter.png'
  }

  repositionSprite() {
    this.sprite.position.x = 50
    this.sprite.position.y = 30
    this.sprite.rotation = 35 * Math.PI/180
  }

  getAnimationTween() {
    let fireSprite = new PIXI.Sprite(PIXI.utils.TextureCache["flame_2.png"])
    fireSprite.width = Constants.tileSize/2
    fireSprite.height = Constants.tileSize/2
    fireSprite.position.x = 55
    fireSprite.position.y = 0
    fireSprite.rotation = 35 * Math.PI / 180
    fireSprite.alpha = 0

    this.sprite.parent.addChild(fireSprite)

    window.f = fireSprite

    let alpha = { alpha: 0 }

    return new TWEEN.Tween(alpha)
            .to({ alpha: 1  }, 200)
            .onUpdate(() => {
              fireSprite.alpha = alpha.alpha
            })
            .onComplete(() => {
              if (fireSprite.parent) {
                fireSprite.parent.removeChild(fireSprite)
              }
            })
  }

  getType() {
    return Protocol.definition().BuildingType.Lighter
  }

  getConstantsTable() {
    return "Equipments.Lighter"
  }

}

module.exports = Lighter
