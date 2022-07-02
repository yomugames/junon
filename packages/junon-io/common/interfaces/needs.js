const Constants = require("./../constants.json")
const Protocol = require('./../util/protocol')

const Needs = () => {
}

Needs.prototype = {
  initNeeds() {
    this.hunger = this.getMaxHunger()
    this.oxygen = this.getMaxOxygen()
    this.stamina = this.getMaxStamina()
    this.happiness = this.getMaxHappiness()
  },
  setStamina(stamina) {
    let prevStamina = this.stamina

    if (stamina > this.getMaxStamina()) {
      this.stamina = this.getMaxStamina()
    } else if (stamina < 0) {
      this.stamina = 0
    } else {
      this.stamina = stamina
    }

    if (prevStamina !== this.stamina) {
      this.onStaminaChanged(this.stamina - prevStamina)
    }
  },
  setHunger(hunger) {
    let prevHunger = this.hunger

    if (hunger > this.getMaxHunger()) {
      this.hunger = this.getMaxHunger()
    } else if (hunger < 0) {
      this.hunger = 0
    } else {
      this.hunger = hunger
    }

    if (prevHunger !== this.hunger) {
      this.onHungerChanged(this.hunger - prevHunger)
    }

    if (this.hunger === 0) {
      this.onHungerZero()
    }
  },
  setHappiness(happiness) {
    let prevHappiness = this.happiness

    if (happiness > this.getMaxHappiness()) {
      this.happiness = this.getMaxHappiness()
    } else if (happiness < 0) {
      this.happiness = 0
    } else {
      this.happiness = happiness
    }

    if (prevHappiness !== this.happiness) {
      this.onHappinessChanged()
    }
  },
  setOxygen(oxygen) {
    let prevOxygen = this.oxygen

    if (oxygen > this.getMaxOxygen()) {
      this.oxygen = this.getMaxOxygen()
    } else if (oxygen < 0) {
      this.oxygen = 0
    } else {
      this.oxygen = oxygen
    }

    if (prevOxygen !== this.oxygen) {
      this.onOxygenChanged(this.oxygen - prevOxygen)
    }
  },
  onHungerChanged(delta) {

  },

  onOxygenChanged(delta) {

  },

  onStaminaChanged(delta) {

  },

  onHappinessChanged() {

  },

  getMaxStamina() {
    return Constants.Player.stamina
  },
  getMaxHappiness() {
    return Constants.Player.happiness
  },
  getMaxOxygen() {
    return Constants.Player.oxygen
  },
  getMaxHunger() {
    return Constants.Player.hunger
  },
  wakeup() {
    this.setSleepState(false) 
  },
  sleep() {
    this.setSleepState(true) 
  },
  setSleepState(isSleeping) {
    if (this.isSleeping !== isSleeping) {
      this.isSleeping = isSleeping
      this.onSleepStateChanged()
    }
  },
  onSleepStateChanged(){

  },
  onHungerZero() {
    
  }
}

module.exports = Needs
