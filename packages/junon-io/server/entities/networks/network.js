const BaseTransientEntity = require("./../base_transient_entity")

class Network {
  constructor(manager) {
    this.id = manager.game.generateId("network")

    this.manager = manager

    this.hits = {}

    this.initMembers()
    this.reset()
  }

  getGame() {
    return this.manager.container.game
  }

  getId() {
    return this.id
  }

  // callback
  onNetworkAssigned(hit) {

  }

  hasHit(hit) {
    return this.hits[this.getTileKey(hit)]
  }

  addHit(hit) {
    let key = this.getTileKey(hit)
    this.hits[key] = hit
  }

  clearHits() {
    this.hits = {}
  }

  removeHit(hit) {
    let hitKey = this.getTileKey(hit)
    delete this.hits[hitKey]
  }

  getTileKey(hit) {
    return hit.row + '-' + hit.col + '-' + hit.entity.id
  }

  onNetworkChanged() {
    this.removeEmptyNetwork()
  }

  removeEmptyNetwork() {
    if (this.isEmpty()) {
      delete this.manager.networks[this.id]
    }
  }

  initMembers() {
    throw new Error("must implement Network#initMembers")
  }

  isEmpty() {
    throw new Error("must implement Network#isEmpty")
  }

  removeMember(entity) {
    throw new Error("must implement Network#removeMember")
  }

  reset() {
    throw new Error("must implement Network#reset")
  }

  hasMember(entity) {
    throw new Error("must implement Network#hasMember")
  }

}

module.exports = Network
