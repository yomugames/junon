const PressureSealer = () => {
}

PressureSealer.prototype = {
  initPressureSealer() {
    this.pressurables = {}
    this.isPressureSealer = true

    this.close()
  },

  setPressureManager(pressureManager) {
    this.pressureManager = pressureManager
  },

  addPressurable(pressurable) {
    this.pressurables[pressurable.id] = pressurable
  },

  removePressurable(pressurable) {
    delete this.pressurables[pressurable.id]
  },

  open() {
    this.isOpen = true
    this.pressurize()
    this.onSealerStateChanged()
  },

  close() {
    this.isOpen = false
    this.pressurize()
    this.onSealerStateChanged()
  },

  onSealerStateChanged() {
  },

  pressurize() {
    let pressurables = this.getPressurables()
    if (pressurables.length === 0) return

    if (this.isOpen) {
      this.getPressureManager().allocateNetwork({ room: pressurables[0]} )
    } else {
      this.getPressureManager().partition({ rooms: pressurables })
    }
  },

  getPressurables() {
    return Object.values(this.pressurables)
  },

  getPressureManager() {
    let pressurable = this.getPressurables()[0]
    if (pressurable) {
      return pressurable.getPressureManager()
    } else {
      return null
    }
  },

  hasVacuum() {
    throw "must implement PressureSealer#hasVacuum"
  }

}

module.exports = PressureSealer

