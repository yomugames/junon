const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")
const Wire = require("./wire")
const BitmapText = require("../../util/bitmap_text")

class MiningDrill extends BaseBuilding {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    if (this.getOreOutput() === "iron") {
      this.baseSprite.tint = 0x66ff66
    }
    
    this.tween = this.getRotatingTween()
  }

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let box = this.getBox(x, y, w, h)
    let checkFull = false
    let excludeOutOfBounds = false

    let groundHits = container.groundMap.hitTestTile(box, checkFull, excludeOutOfBounds)
    let isAllGround = groundHits.every((hit) => {
      return hit.entity
    })

    return isAllGround
  }

  onPositionBecomeInvalid() {
    this.oreOutputText.sprite.alpha = 0
  }

  onPositionBecomeValid() {
    this.oreOutputText.sprite.alpha = 1
  }

  postBuildingEquipDisplayed() {
    super.postBuildingEquipDisplayed()
    this.addOreOutputDisplay()
  }

  addOreOutputDisplay() {
    const oreOutputLabel = Helper.capitalizeWords(this.getOreOutput() + " deposits")

    this.oreOutputText = BitmapText.create({
      label: 'OreOutput',
      text: oreOutputLabel,
      spriteContainer: this.sprite
    })

    this.oreOutputText.sprite.position.y = Constants.tileSize * 2
  }

  onGridPositionChanged() {
    super.onGridPositionChanged()
    
    if (this.oreOutputText) {
      this.oreOutputText.sprite.text = Helper.capitalizeWords(this.getOreOutput() + " deposits")
    }
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

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const fadeOutTween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 3000)
        .onUpdate(() => {
          this.guardSpriteContainer.rotation = rotation.rotation
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

    if (this.oreOutputText) {
      this.oreOutputText.remove()
    }

    this.cleanupTween()
  }

  openMenu() {
    let shouldHideInputSlot = true
    this.game.processorMenu.open("Mining Drill", this, this.getMenuDescription(), shouldHideInputSlot)
  }

  getMenuDescription() {
    let ore = this.getOreOutput()    
    return i18n.t("Generates " + Helper.capitalize(ore) + " Ore")
  }

  getType() {
    return Protocol.definition().BuildingType.MiningDrill
  }

  getSpritePath() {
    return "mining_drill.png"
  }

  getConstantsTable() {
    return "Buildings.MiningDrill"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["mining_drill_core.png"])
    this.baseSprite.name = "BaseSprite"
    this.baseSprite.anchor.set(0.5)

    this.guardSpriteContainer = new PIXI.Container()
    this.guardSpriteContainer.name = "GuardContainer"

    let diffs = [
      { angle: 0,   anchor: [0.5,0.5] },
      { angle: 120, anchor: [-1 ,  0] },
      { angle: 240, anchor: [-1 ,  1] }
    ]

    diffs.forEach((diff) => {
      let guardSprite = new PIXI.Sprite(PIXI.utils.TextureCache["mining_drill_guard.png"])
      guardSprite.anchor.set(0.5)
      guardSprite.name = "Guard"
      guardSprite.rotation = diff.angle * Math.PI / 180
      guardSprite.position.x = 30
      guardSprite.anchor.set(diff.anchor[0], diff.anchor[1])
      this.guardSpriteContainer.addChild(guardSprite)
    })

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.guardSpriteContainer)

    return sprite
  }


  getOreOutput() {
    let index = this.getRow() * this.container.getRowCount() + this.getCol()
    if (index % 5 === 0) {
      return "copper"
    } else {
      return "iron"
    }
  }


}

module.exports = MiningDrill
