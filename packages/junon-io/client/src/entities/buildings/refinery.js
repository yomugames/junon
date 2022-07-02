const Bars = require("./../bars/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipments = require("./../equipments/index")

class Refinery extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()
    this.tween = this.getRotatingTween()
  }

  onIsProcessingChanged() {
    if (this.isProcessing) {
      if (!this.tween) {
        this.tween = this.getRotatingTween()
      }
      this.tween.start()
    } else {
      this.tween.stop()
      this.tween = null
    }
  }

  openMenu() {
    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    let shouldHideInput = false
    this.game.processorMenu.open("Refinery", this, this.getMenuDescription(), shouldHideInput, "", options)
  }

  getType() {
    return Protocol.definition().BuildingType.Refinery
  }

  getSpritePath() {
    return "refinery.png"
  }

  getConstantsTable() {
    return "Buildings.Refinery"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["refinery_base.png"])
    this.baseSprite.name = "BaseSprite"
    this.baseSprite.anchor.set(0.5)

    this.gearSprite = new PIXI.Sprite(PIXI.utils.TextureCache["refinery_gear.png"])
    this.gearSprite.name = "GearSprite"
    this.gearSprite.anchor.set(0.5)
    this.gearSprite.position.x = 10
    this.gearSprite.position.y = -40

    this.smallGearSprite = new PIXI.Sprite(PIXI.utils.TextureCache["refinery_gear_small.png"])
    this.smallGearSprite.name = "SmallGearSprite"
    this.smallGearSprite.anchor.set(0.5)
    this.smallGearSprite.position.x = -25
    this.smallGearSprite.position.y = -20

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.gearSprite)
    sprite.addChild(this.smallGearSprite)

    return sprite
  }

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const fadeOutTween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 3000)
        .onUpdate(() => {
          this.gearSprite.rotation = rotation.rotation
          this.smallGearSprite.rotation = rotation.rotation
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

}

module.exports = Refinery
