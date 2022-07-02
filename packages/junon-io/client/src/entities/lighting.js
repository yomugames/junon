const Poolable = require("../../../common/interfaces/poolable")
const ObjectPool = require("../../../common/entities/object_pool")

class Lighting {
  static create(options) {
    let lighting = ObjectPool.obtain("Lighting")
    lighting.setAttributes(options)
    return lighting
  }

  constructor(options) {
  }

  setAttributes(options) {
    this.id = [options.source.constructor.getTypeName(), options.source.id].join("-")
    this.row = options.row
    this.col = options.col
    this.distance = options.distance
    this.source = options.source
    this.color = options.color
    this.brightnessFactor = options.brightnessFactor // 0-100 (tinycolor2 spec)
  }

  isLightSource() {
    return this.source.isLightSource()
  }

  isLightBlocker() {
    return this.source.isLightBlocker()
  }

  remove() {
    ObjectPool.free("Lighting", this)
  }

}

Object.assign(Lighting.prototype, Poolable.prototype, {
  reset() {
    // not needed. every instance variable is overwritten anyway
  }
})

module.exports = Lighting
