const Constants = require("./../constants.json")
const Helper = require("./../helper")

const Owner = () => {
}

Owner.prototype = {
  initOwner() {
    this.ownerships = {}
    this.rooms = {}
  },

  addRoom(room) {
    this.rooms[room.getId()] = room
  },

  removeRoom(room) {
    delete this.rooms[room.getId()] 
  },

  getOwnerships(types) {
    return this.ownerships[types] || {}
  },

  getOwnedStructures() {
    if (!this.ownerships["structures"]) return []

    return Object.values(this.ownerships["structures"])
  },

  registerOwnership(collectionName, entity) {
    if (!collectionName) return

    if (!this.ownerships[collectionName]) {
      this.ownerships[collectionName] = {}
    }

    this.ownerships[collectionName][entity.id] = entity
    this.onOwnershipChanged(entity)
  },

  unregisterOwnership(collectionName, entity) {
    if (!collectionName) return
      
    if (!this.ownerships[collectionName]) return
    delete this.ownerships[collectionName][entity.id]
    this.onOwnershipChanged(entity, { removed: true })
  },

  onOwnershipChanged(entity, options = {}) {

  },

  transferOwnershipsTo(targetOwner) {
    for (let group in this.ownerships) {
      let ownershipByEntity = this.ownerships[group]
      for (let entityId in ownershipByEntity) {
        let entity = ownershipByEntity[entityId]
        this.unregisterOwnership(group, entity)
        entity.setOwner(targetOwner)
        targetOwner.registerOwnership(group, entity)
      }
    }

    this.ownerships = {}
  },

  removeOwnerships() {
    for (let group in this.ownerships) {
      let ownershipByEntity = this.ownerships[group]
      for (let entityId in ownershipByEntity) {
        let entity = ownershipByEntity[entityId]
        entity.setOwner(null)
        this.unregisterOwnership(group, entity)
      }
    }

    this.ownerships = {}
  }

}

module.exports = Owner
