const EventBus = require('eventbusjs')

class Goal {
  constructor(options) {
    this.sourceEntity  = options.sourceEntity
    this.targetEntity  = options.targetEntity
    this.game = options.targetEntity.game
    this.onReachedListener      = options.callback
    this.isExact = options.isExact

    this.init()
  }

  init() {
  }

  hasTargetEntity(entity) {
    return this.targetEntity === entity
  }

  requiresExactPosition() {
    return this.isExact
  }

  getTargetEntity() {
    return this.targetEntity
  }

  setOnReachedListener(listener) {
    this.onReachedListener = listener
  }

  onReached() {
    if (this.onReachedListener) {
      this.onReachedListener(this.targetEntity)
    }
  }

  isInvalid() {
    return this.getTargetEntity().isDestroyed() ||
           this.getTargetEntity().isInvisible()
  }

  setOnRemovedListener(listener) {
    this.onRemovedListener = listener
  }

  unreachable() {
    EventBus.dispatch(`${this.game.getId()}:entity:unreachable:${this.getTargetEntity().getId()}`, this.getTargetEntity())
  }

  remove() {
    this.sourceEntity.removeGoal(this)
    
    if (this.onRemovedListener) {
      this.onRemovedListener(this.sourceEntity)
    }

    this.onReachedListener = null
    this.onRemovedListener = null
  }
}

module.exports = Goal