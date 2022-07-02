const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Reactor extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    const energy = this.getStats(this.level).energy
    this.increaseEnergyCapacity(energy)
  }

  onLevelIncreased() {
    const oldEnergy = this.getStats(this.level - 1).energy
    const energy    = this.getStats(this.level).energy
    const delta     = energy - oldEnergy

    this.increaseEnergyCapacity(delta)
  }

  increaseEnergyCapacity(energy) {
    this.container.setEnergyCapacity(this.container.energyCapacity + energy)
  }

  decreaseEnergyCapacity(energy) {
    this.container.setEnergyCapacity(this.container.energyCapacity - energy)
  }

  getConstantsTable() {
    return "Buildings.Reactor"
  }

  remove() {
    super.remove()

    const energy = this.getStats(this.level).energy
    this.decreaseEnergyCapacity(energy)
  }

  getType() {
    return Protocol.definition().BuildingType.Reactor
  }

}

module.exports = Reactor

