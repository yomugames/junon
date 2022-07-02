const Poolable = require("../../../common/interfaces/poolable")
const ObjectPool = require("../../../common/entities/object_pool")

class SpritePoolInstance {
  static create(options) {
    let sprite = ObjectPool.obtain("Sprite")
    sprite.setAttributes(options)
    return sprite
  }

  constructor() {
    this.sprite = new PIXI.Sprite()
  }

  setAttributes(options) {
    this.sprite.texture = options.texture
  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
    ObjectPool.free("Sprite", this)
  }

}

Object.assign(SpritePoolInstance.prototype, Poolable.prototype, {
  reset() {
    this.sprite.name = ""
  }
})

module.exports = SpritePoolInstance
