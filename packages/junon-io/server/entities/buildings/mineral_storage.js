const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class MineralStorage extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    //this.container.mineralStorages[this.id] = this
    this.mineralCapacity = 0
    this.mineralUsage = 0

    const minerals = this.getStats(this.level).minerals
    this.increaseMineralCapacity(minerals)
  }

  unregister() {
    super.unregister()
    //delete this.container.mineralStorages[this.id]
  }

  hasEnoughMineralStorage() {
    return this.mineralUsage  < this.mineralCapacity
  }

  onLevelIncreased() {
    const oldMinerals = this.getStats(this.level - 1).minerals
    const minerals    = this.getStats(this.level).minerals
    const delta     = minerals - oldMinerals

    this.increaseMineralCapacity(delta)
  }

  store(minerals) {
    const remainingCapacity = this.mineralCapacity - this.mineralUsage
    const unstored = Math.max(minerals - remainingCapacity, 0)
    this.setMineralUsage(this.mineralUsage + minerals)

    return unstored
  }

  retrieve() {
    const minerals = this.mineralUsage
    this.setMineralUsage(0)
    return minerals
  }

  setMineralCapacity(capacity) {
    if (capacity < 0) capacity = 0
    this.mineralCapacity = capacity
  }

  setMineralUsage(usage) {
    if (usage < 0) usage = 0
    if (usage > this.mineralCapacity) usage = this.mineralCapacity

    this.mineralUsage = usage
  }

  increaseMineralCapacity(minerals) {
    this.setMineralCapacity(this.mineralCapacity + minerals)
  }

  decreaseMineralCapacity(minerals) {
    this.setMineralCapacity(this.mineralCapacity - minerals)
  }


  getConstantsTable() {
    return "Buildings.MineralStorage"
  }

  remove() {
    super.remove()

    const minerals = this.getStats(this.level).minerals
    this.decreaseMineralCapacity(minerals)
  }


  getType() {
    return Protocol.definition().BuildingType.MineralStorage
  }

}

module.exports = MineralStorage
