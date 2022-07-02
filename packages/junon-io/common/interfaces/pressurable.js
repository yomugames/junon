// tiedly coupled to pressureNetwork..
const Pressurable = () => {
}

Pressurable.prototype = {
  initPressurable() {
    this.sealers = {}
    this.isPressurable = true
  },

  getDetectedVacuums() {
    if (!this.pressureNetwork) return []

    let sealers = Object.values(this.sealers)
    return sealers.filter((sealer) => { 
      return this.pressureNetwork.hasVacuum(sealer) 
    })
  },

  setPressureManager(pressureManager) {
    this.pressureManager = pressureManager
  },

  getPressureManager() {
    return this.pressureManager
  },

  addPressureSealer(sealer) {
    this.sealers[sealer.id] = sealer
    sealer.addPressurable(this)
  },

  removeFromPressureNetwork() {
    let pressureNetwork = this.getPressureNetwork()
    if (pressureNetwork) {
      pressureNetwork.removeMember(this)
    }
  },

  removePressureSealer(sealer) {
    delete this.sealers[sealer.id] 
    sealer.removePressurable(this)
  },

  getNeighborMembers() {
    let sealers = Object.values(this.sealers)
    let neighbors = {}

    sealers.forEach((sealer) => {
      if (sealer.isOpen) {
        let pressurables = sealer.getPressurables()
        pressurables.forEach((pressurable) => {
          if (pressurable !== this) {
            neighbors[pressurable.id] = pressurable
          }
        })
      }
    })

    return Object.values(neighbors)
  }  

}

module.exports = Pressurable

