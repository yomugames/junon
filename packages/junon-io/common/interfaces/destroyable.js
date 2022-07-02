const EventBus = require('eventbusjs')

const Destroyable = () => {
}

Destroyable.prototype = {
  initDestroyable(initialHealth) {
    this.health = initialHealth || this.getMaxHealth()
  },

  getMaxHealth() {
    return 10    
  },

  getHealth() {
    return this.health
  },

  isHealthFull() {
    return this.health === this.getMaxHealth()
  },

  isDestroyed() {
    return this.health === 0
  },

  isDestroyable() {
    return true
  },

  damage(amount, attacker, attackEntity) {
    if (isNaN(amount)) {
      throw new Error("damage amount " + amount + " is invalid")
    }

    if (!attackEntity) {
      attackEntity = attacker
    }

    amount = Math.max(1, amount - this.getDamageResistance(amount, attackEntity))
    amount = parseInt(amount)

    const prevHealth = this.health 
    
    this.onDamaged(attacker, amount)
    this.setHealth(this.health - amount)
  },

  reduceHealth(amount = 1) {
    this.setHealth(this.health - amount)
  },

  getDamageResistance(amount, attackEntity) {
    return 0
  },

  setHealth(newHealth) {
    const prevHealth = this.health

    if (newHealth < 0) { 
      newHealth = 0;
    } else if (newHealth > this.getMaxHealth()) { 
      newHealth = this.getMaxHealth()
    }

    const delta = newHealth - prevHealth
    this.health = newHealth

    if (isNaN(delta)) {
      throw new Error("delta is not a number. prevHealth: " + prevHealth + " newHealth: " + newHealth)
    }

    if (delta < 0) {
      this.onHealthReduced(delta)

      if (this.health === 0 && prevHealth !== 0) {
        EventBus.dispatch(this.game.getId() + ":entity:destroyed", this)
        this.onHealthZero()
      }
      
      this.onPostSetHealth(delta)
    } else if (delta > 0) {
      this.onHealthIncreased(delta)

      this.onPostSetHealth(delta)
    } else if (this.health === 0 && prevHealth !== 0) {
      EventBus.dispatch(this.game.getId() + ":entity:destroyed", this)
      this.onHealthZero()
    }
  },

  onDamaged(attacker) {}, // callback for actual physic damage as opposed to generic one
  onPostSetHealth() {},
  onHealthReduced(delta) {},
  onHealthIncreased(delta) {},
  onHealthZero() {}

}

module.exports = Destroyable

