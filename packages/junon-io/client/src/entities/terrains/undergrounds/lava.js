const BaseUnderground = require("./base_underground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Lava extends BaseUnderground {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    if (Math.random() < 0.15) {
      this.animate()
    }
  }

  animate() {
    this.animateLava()
  }

  animateLava() {
    if (this.tween) return
    if (this.bubbleSprite) return

    this.bubbleSprite = this.getBubbleSprite()
    this.sector.groundEffectsContainer.addChild(this.bubbleSprite)

    let width = { width: this.bubbleSprite.width }

    this.tween = new TWEEN.Tween(width)
        .to({ width: this.bubbleSprite.width + 20 }, 1000)
        .onUpdate(() => {
          this.bubbleSprite.width  = width.width
          this.bubbleSprite.height = width.width
        })
        .onComplete(() => {
          this.sector.groundEffectsContainer.removeChild(this.bubbleSprite)
          this.tween = null
        })
        .repeat(Infinity)
        .yoyo(true)

    this.tween.start()
  }

  getBubbleSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["lava_bubble.png"])
    sprite.anchor.set(0.5)

    let randomWidth = Math.floor(Math.random() * 7) + 2
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()

    return sprite
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

    if (this.bubbleSprite) {
      this.bubbleSprite.parent.removeChild(this.bubbleSprite)
      this.bubbleSprite = null
    }
  }

  onCovered() {
    if (this.bubbleSprite) {
      this.cleanupTween()
      this.bubbleSprite.parent.removeChild(this.bubbleSprite)
      this.bubbleSprite = null
    }
  }

  onUncovered() {
    if (Math.random() < 0.15) {
      this.animate()
    }
  }

  getSpritePath() {
    return 'lava.png'
  }

  getType() {
    return Protocol.definition().TerrainType.Lava
  }

  getConstantsTable() {
    return "Terrains.Lava"
  }

}

module.exports = Lava
