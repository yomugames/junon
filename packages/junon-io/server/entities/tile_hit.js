const Poolable = require("../../common/interfaces/poolable")
const ObjectPool = require("../../common/entities/object_pool")

class TileHit {
  static create() {
    return ObjectPool.obtain("TileHit")
  }

  constructor() {
    this.initVariables()
  } 

  initVariables() {
    this.row = -1  
    this.col = -1  
    this.type = 0
    this.entity = null
  }

  remove() {
    ObjectPool.free("TileHit", this)
  }
}

Object.assign(TileHit.prototype, Poolable.prototype, {
  reset() {
    this.initVariables()
  }
})

module.exports = TileHit