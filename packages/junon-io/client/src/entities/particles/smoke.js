const Poolable = require("../../../../common/interfaces/poolable")
const ObjectPool = require("../../../../common/entities/object_pool")
const ClientHelper = require("../../util/client_helper")

class Smoke {
  static create(options) {
    let smoke = ObjectPool.obtain("Smoke")
    smoke.setAttributes(options)
    smoke.animate()
    return smoke
  }

  setAttributes(options) {
    let shouldRandomizeDistance = (typeof options.shouldRandomizeDistance === 'undefined') ? true : options.shouldRandomizeDistance
    let x = options.x
    let y = options.y
    let color = options.color

    const randomDistanceX = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0
    const randomDistanceY = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0

    const randomWidth = Math.floor(Math.random() * (options.maxWidth - options.minWidth)) + options.minWidth
    this.sprite.width = randomWidth
    this.sprite.height = randomWidth
    this.sprite.tint = color
    this.sprite.position.x = x - randomDistanceX
    this.sprite.position.y = y - randomDistanceY

    if (options.moveTo) {
      this.moveTo = { 
        x: this.sprite.position.x + options.moveTo.x,
        y: this.sprite.position.y + options.moveTo.y
      }
    }

    game.sector.effectsContainer.addChild(this.sprite)
  }

  constructor() {
    this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache["white_smoke.png"])
    this.sprite.anchor.set(0.5)
  }

  animate() {
    let current = { alpha: 0.8 }
    let destination = { alpha: 0 }

    if (this.moveTo) {
      current.x = this.sprite.position.x
      current.y = this.sprite.position.y

      destination.x = this.moveTo.x
      destination.y = this.moveTo.y
    }

    var tween = new TWEEN.Tween(current)
        .to(destination, 4000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          this.sprite.alpha = current.alpha
          if (this.moveTo) {
            this.sprite.position.x = current.x
            this.sprite.position.y = current.y
          }
        })
        .onComplete(() => {
          this.remove()
        })
    tween.start()
  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
    this.moveTo = null
    ObjectPool.free("Smoke", this)
  }

}

Object.assign(Smoke.prototype, Poolable.prototype, {
  reset() {
    // not needed. every instance variable is overwritten anyway
  }
})

module.exports = Smoke