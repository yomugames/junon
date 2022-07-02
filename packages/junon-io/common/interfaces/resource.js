const Resource = () => {
}

Resource.prototype = {
  getResourceConsumption(name) {
    let field = name + "Consumption"
    return this.getStats(this.level)[field]
  },

  getResourceCapacity(name) {
    let field = name + "Capacity"
    return this.getStats(this.level)[field]
  },

  getResourceProduction(name) {
    let field = name + "Production"
    return this.getStats(this.level)[field]
  }
}

module.exports = Resource
