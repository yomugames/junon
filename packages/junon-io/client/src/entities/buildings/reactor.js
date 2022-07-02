const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Reactor extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    this.tween = this.getRotatingTween()
    this.tween.start()
  }

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const fadeOutTween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 1000)
        .onUpdate(() => {
          this.rotatorSprite.rotation = rotation.rotation
        })
        .repeat(Infinity)

    return fadeOutTween
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }


  getSpritePath() {
    return this.getRotatorSpritePath()
  }

  getBaseSpritePath() {
    return "reactor_base.png"
  }

  getRotatorSpritePath() {
    return "reactor_rotator.png"
  }


  getBuildingSprite() {
    const sprite = new PIXI.Container()

    const baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBaseSpritePath()])
    baseSprite.anchor.set(0.5)
    baseSprite.width = this.getWidth()
    baseSprite.height = this.getHeight()

    this.rotatorSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getRotatorSpritePath()])

    this.rotatorSprite.anchor.set(0.5)
    this.rotatorSprite.width = this.getWidth()
    this.rotatorSprite.height = this.getHeight()



    sprite.addChild(baseSprite)
    sprite.addChild(this.rotatorSprite)

    return sprite
  }


  getType() {
    return Protocol.definition().BuildingType.Reactor
  }

  getConstantsTable() {
    return "Buildings.Reactor"
  }

}

module.exports = Reactor
