const EventBus = require('eventbusjs')
const Constants = require('../../common/constants.json')

class Claim {
  constructor(sector, entity, claimer, timestamp) {
    this.sector = sector
    this.game = sector.game
    this.entity = entity
    this.claimer = claimer
    this.timestamp = timestamp

    this.onEntityRemovedListener = this.onEntityRemoved.bind(this)
    this.onClaimerRemovedListener = this.onClaimerRemoved.bind(this)
    this.onEntityUnreachableListener = this.onEntityUnreachable.bind(this)

    EventBus.addEventListener(`${this.game.getId()}:entity:removed:${this.entity.getId()}`, this.onEntityRemovedListener)
    EventBus.addEventListener(`${this.game.getId()}:entity:removed:${this.claimer.getId()}`, this.onClaimerRemovedListener)
    EventBus.addEventListener(`${this.game.getId()}:entity:unreachable:${this.entity.getId()}`, this.onEntityUnreachableListener)

    this.register()
  }

  isExpired() {
    let timestampDuration = this.game.timestamp - this.timestamp
    return timestampDuration > (Constants.physicsTimeStep * 60 * 5)
  }

  register() {
    this.sector.claims[this.entity.id] = this
    // this.entity.claim = this
    // this.claimer.claim = this
  }

  unregister() {
    delete this.sector.claims[this.entity.id] 
    // this.entity.claim = null
    // this.claimer.claim = null
  }

  onEntityUnreachable() {
    this.remove()
  }

  onEntityRemoved() {
    this.remove()
  }

  onClaimerRemoved() {
    this.remove()
  }

  remove() {
    EventBus.removeEventListener(`${this.game.getId()}:entity:removed:${this.entity.getId()}`, this.onEntityRemovedListener)
    EventBus.removeEventListener(`${this.game.getId()}:entity:removed:${this.claimer.getId()}`, this.onClaimerRemovedListener)
    EventBus.removeEventListener(`${this.game.getId()}:entity:unreachable:${this.entity.getId()}`, this.onEntityUnreachableListener)

    this.unregister()
  }
}

module.exports = Claim