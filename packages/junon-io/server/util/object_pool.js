class ObjectPool {

  static create(klass) {
    this.pools = this.pools || {}

    let pool = new ObjectPool(klass)

    this.pools[klass.name] = pool
  }

  static obtain(klass) {
    let pool = this.pools[klass.name]
    if (!pool) throw new Error("object pool " + klass.name + " not found")
    
    return pool.obtain()
  }

  static reset() {
    for (let klassName in this.pools) {
      let pool = this.pools[klassName]
      pool.reset()
    }
  }

  static free(instance) {
    let klass = instance.constructor
    let pool = this.pools[klass.name]
    if (!pool) throw new Error("object pool " + klass.name + " not found")
    
    pool.free(instance)    
  }

  constructor(klass) {
    this.klass = klass
    this.freeList = []
  }

  reset() {
    this.freeList = []
  }

  obtain() {
    let object

    if (this.freeList.length === 0) {
      // nothing in freelist
      object = new this.klass()
    } else {
      object = this.freeList.pop()
    }
    
    return object
  }

  free(object) {
    object.reset()
    this.freeList.push(object)
  }
}

module.exports = ObjectPool
