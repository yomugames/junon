const Poolable = require("../../../../common/interfaces/poolable")
const ObjectPool = require("../../../../common/entities/object_pool")
const ClientHelper = require("../../util/client_helper")

class Trail {
  static create(options) {
    let trail = ObjectPool.obtain("Trail")
    trail.setAttributes(options)
    trail.animate()
    return trail
  }

  setAttributes(options) {
    this.isExpanding = options.isExpanding
    this.isShrinking = options.isShrinking

    let angle = options.angle
    let offset = options.offset
    let color = options.color
    let spritePath = options.spritePath || "white_smoke.png"
    let spriteContainer = options.spriteContainer || game.sector.effectsContainer

    this.sourceColor      = "#" + Number(options.color).toString(16)
    if (options.destinationColor) {
      this.destinationColor = "#" + Number(options.destinationColor).toString(16) 
    } else {
      this.destinationColor = null
    }

    const randomWidth = Math.floor(Math.random() * options.radius) + 10
    this.sprite.width = randomWidth
    this.sprite.height = randomWidth
    this.sprite.tint = color

    this.sprite.position.x = options.x - offset * Math.cos(angle)
    this.sprite.position.y = options.y - offset * Math.sin(angle) // opposite y direction

    this.sprite.texture = PIXI.utils.TextureCache[spritePath]
    spriteContainer.addChild(this.sprite)
  }

  constructor() {
    this.sprite = new PIXI.Sprite()
    this.sprite.anchor.set(0.5)
  }

  animate() {
    let alpha = { alpha: 1 }
    let maxExpansion = 32
    let origWidth = this.sprite.width

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 1500)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          this.sprite.alpha = alpha.alpha
          if (this.isExpanding) {
            let delta = maxExpansion - alpha.alpha * maxExpansion
            this.sprite.width  = origWidth + delta
            this.sprite.height = origWidth + delta
          } else if (this.isShrinking) {
            let delta = (1 - alpha.alpha) * maxExpansion
            let newWidth = origWidth - delta
            this.sprite.width  = newWidth < 0 ? 0 : newWidth
            this.sprite.height = newWidth < 0 ? 0 : newWidth
          }

          if (this.destinationColor) {
            let ratio = 1 - alpha.alpha
            let tint = ClientHelper.getRandomColorInRange(
                         this.sourceColor, 
                         this.destinationColor, 
                         ratio, 
                         { shouldReturnInteger: true })

            this.sprite.tint = tint
          }
        })
        .onComplete(() => {
          this.remove()
        })
        .start()

  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
    ObjectPool.free("Trail", this)
  }

}

Object.assign(Trail.prototype, Poolable.prototype, {
  reset() {
    // not needed. every instance variable is overwritten anyway
  }
})

module.exports = Trail