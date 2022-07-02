const BaseEntity = require("./base_entity")
const Item = require("./item")
const Constants = require('../../common/constants.json')
const SocketUtil = require("junon-common/socket_util")

class Pickup extends BaseEntity {
  constructor(container, data) {
    super(container.sector, data)

    this.container = container
    this.item = data.item

    this.onPickupCreated()
  }

  getTypeName() {
    return this.item.getTypeName()
  }

  static createDrop(options = {}) {
    // required: x, y
    let x = options.x
    let y = options.y
    let item  = options.item

    // required: either "item" or "sector", "type", "count"

    let sector = item ? item.getSector() : options.sector
    let type = item ? item.type : options.type 
    let count = item ? item.count : options.count
    let instance = item ? item.instance : null

    if (!count) {
      count = Math.floor(Math.random() * 3) + 1
    }

    item = new Item(sector, type, { count: count, instance: instance })

    let data = {
      x: x,
      y: y,
      item: item
    }

    let pickup = new Pickup(sector, data)
    return pickup
  }

  shouldDecay() {
    let aliveDuration = this.game.timestamp - this.createTimestamp
    let maxSeconds = 60 * 30
    let maxTicks   = maxSeconds * Constants.physicsTimeStep

    return aliveDuration > maxTicks
  }

  onPickupCreated() {
    this.createTimestamp = this.game.timestamp 

    this.container.addPickup(this)
    this.sector.insertEntityToTreeByName(this, "pickups")

    this.onStateChanged()
  }

  shouldEmitEntityRemoved() {
    return false
  }

  remove() {
    super.remove()

    this.container.removePickup(this)
    this.sector.removeEntityFromTreeByName(this, "pickups")

    this.clientMustDelete = true
    this.onStateChanged()
  }

  getCollisionMask() {
    return Constants.collisionGroup.Player
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Pickup
  }

  getConstantsTable() {
    return "Pickup"
  }

  giveTo(player) {
    if (player.inventory.isFull(this.item.type)) {
      player.showError("Inventory Full")
      return false
    }

    if (player.inventory.isFullyStored()) {
      let item = player.inventory.getStackableItem(this.item.type)
      if (!item) return false
        
      if (this.item.count + item.count > Constants.maxStackCount) {
        player.showError("Inventory Full")
        return false
      }
    }

    this.item.setOwner(player)

    let isStoredSuccessfully = player.inventory.store(this.item)

    this.remove()

    return isStoredSuccessfully
  }

  onStateChanged() {
    if (!this.container.isMovable()) {
      let chunk = this.getChunk()
      if (chunk) {
        chunk.addChangedPickups(this)
      }
    }
  }

}

module.exports = Pickup

