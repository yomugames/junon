const Network = require("./network")

class ProducerConsumerNetwork extends Network {

  getResourceName() {
    throw new Error("must implement ProducerConsumerNetwork#getResourceName")
  }
  
  initMembers() {
    this.conduits = {}
    this.producers = {}
    this.storages = {}
    this.consumers = {}
    
    this.hasNoMembers = true
  }

  getTotalResourceStored() {
    let result = 0

    for (let key in this.storages) {
      let hit = this.storages[key]
      result += hit.entity.getResourceStored(this.getResourceName())
    }

    return result
  }

  hasAvailableStorage() {
    return this.getAvailableStorage()
  }

  hasStorage() {
    return Object.keys(this.storages).length > 0
  }

  hasEnoughStored(amount = 1) {
    return this.getTotalResourceStored() >= amount
  }


  hasEntity(entity) {
    return this.conduits[entity.id] ||
           this.producers[entity.id] ||
           this.storages[entity.id] ||
           this.consumers[entity.id] 
  }

  getEntityKey(entity) {
    return this.getTileKey({ row: entity.getRow(), col: entity.getCol() })
  }

  consumeResource(consumer) {
    let consumption = consumer.getResourceConsumption(this.getResourceName())

    let storage = Object.values(this.storages).find((storage) => {
      return storage.entity.getResourceStored(this.getResourceName()) >= consumption
    })

    if (storage) {
      return storage.entity.consumeResource(this.getResourceName(), consumption)
    } else {
      return 0
    }
  }

  getAvailableStorage() {
    let result
    for (let key in this.storages) {
      let hit = this.storages[key]
      if (!hit.entity.isResourceFull(this.getResourceName())) {
        result = hit
        break
      }
    }
    return result
  }

  fillResource(producer) {
    let excess = producer.getResourceProduction(this.getResourceName())

    while (excess > 0) {
      let storage = this.getAvailableStorage()
      if (!storage) break
        
      excess = storage.entity.fillResource(this.getResourceName(), excess)
    }
  }

  onNetworkChanged() {
    this.removeEmptyNetwork()
  }

  isEmpty() {
    return this.hasNoMembers 
  }

  getTotalMemberCount() {
     return Object.keys(this.producers).length +
            Object.keys(this.storages).length +
            Object.keys(this.conduits).length +
            Object.keys(this.consumers).length 
  }

  addConduit(hit) {
    this.hasNoMembers = false

    this.addHit(hit)
    this.conduits[hit.entity.id] = hit
    this.onNetworkChanged()
  }

  addProducer(hit) {
    this.hasNoMembers = false

    this.addHit(hit)
    this.producers[hit.entity.id] = hit
    this.onNetworkChanged()
  }

  addStorage(hit) {
    this.hasNoMembers = false

    this.addHit(hit)
    this.storages[hit.entity.id] = hit
    this.onNetworkChanged()
  }

  addConsumer(hit) {
    this.hasNoMembers = false

    this.addHit(hit)
    this.consumers[hit.entity.id] = hit
    this.onNetworkChanged()
  }

  removeMember(entity) {
    let hits = entity.getHits()
    hits.forEach((hit) => {
      this.removeHit(hit)
    })

    delete this.conduits[entity.id]
    delete this.producers[entity.id]
    delete this.consumers[entity.id]
    delete this.storages[entity.id]

    if (this.getTotalMemberCount() === 0) {
      this.hasNoMembers = true
    }
    
    this.onNetworkChanged()
  }

  forEachMember(cb) {
    const groups = [this.conduits, this.producers, this.consumers, this.storages]

    for (var i = 0; i < groups.length; i++) {
      let group = groups[i]
      for (let id in group) {
        let hit = group[id]
        cb(hit)
      }
    }
  }

  reset() {
    const groups = [this.conduits, this.producers, this.consumers, this.storages]

    for (var i = 0; i < groups.length; i++) {
      let group = groups[i]
      for (let id in group) {
        let hit = group[id]
        this.manager.unassignNetworkFromEntity(hit, this) 
      }
    }

    this.conduits = {}
    this.producers = {}
    this.consumers = {}
    this.storages = {}
    
    this.clearHits()

    this.hasNoMembers = true

    this.onNetworkChanged()
  }


}

module.exports = ProducerConsumerNetwork