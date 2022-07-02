const Drainable = require('../../common/interfaces/drainable')

function ResourceStorage() {

}

ResourceStorage.prototype = {
  initResourceStorage() {
    let resources = ["liquid", "oxygen", "power", "fuel"]
    
    let availableResourceStorages = resources.filter((resource) => {
      let resourceAttribute = resource + "Capacity"
      let hasResourceAttribute = this.getStats()[resourceAttribute]
      return hasResourceAttribute
    })

    if (availableResourceStorages.length > 0) {
      this.resourceStorages = {}

      availableResourceStorages.forEach((resource) => {
        this.setupResource(resource)
      })
    }
  },

  setupResource(resource) {
    this.resourceStorages[resource] = new Drainable(0, this.getResourceCapacity(resource), this, resource)
    this.resourceStorages[resource].setUsageChangedListener(this)
    this.resourceStorages[resource].setDrainableDelayedListener(this)
  },

  getResourceStored(name) {
    return this.resourceStorages[name].getUsage()
  },

  consumeResource(name, amount = 1) {
    return this.resourceStorages[name].drainDelayed(amount)
  },

  fillResource(name, amount) {
    return this.resourceStorages[name].fillDelayed(name, amount)
  },

  isResourceFull(name) {
    return this.resourceStorages[name].isFull()
  },

  onUsageChanged(resource, usage) {
    this.onStateChanged("resourceStorages")
  },

  onDrainableDelayed() {

  }

}

module.exports = ResourceStorage
