class ObjectPool {

  static create(name, klass) {
    this.pools = this.pools || {}

    let pool = new ObjectPool(klass)

    // after minification, javascript klass.name is changed and could result in conflicts
    // rely on static string name instead
    this.pools[name] = pool
  }

  static obtain(name, ...args) {
    let pool = this.pools[name]
    if (!pool) throw new Error("object pool " + name + " not found")
    
    return pool.obtain(...args)
  }

  static reset() {
    for (let name in this.pools) {
      let pool = this.pools[name]
      pool.reset()
    }
  }

  static free(name, instance) {
    let pool = this.pools[name]
    if (!pool) throw new Error("object pool " + name + " not found")
    
    pool.free(instance)    
  }

  constructor(klass) {
    this.klass = klass
    this.freeList = []
    this.count = 0
  }

  reset() {
    this.freeList = []
    this.count = 0
  }

  obtain(...args) {
    let object

    if (this.count === 0) {
      // nothing in freelist
      object = new this.klass(...args)
    } else {
      this.count--
      object = this.freeList[this.count]
    }
    
    return object
  }

  free(object) {
    object.reset()
    this.freeList[this.count] = object
    this.count++
  }
}

module.exports = ObjectPool