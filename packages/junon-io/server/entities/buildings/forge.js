const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Ammos = require("./../ammos/index")

class Forge extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Forge"
  }

  getType() {
    return Protocol.definition().BuildingType.Forge
  }

  canCraft(type) {
    if (this.isFull()) return false

    return true
  }

  craft(item, inventoryInput) {
    if (!this.hasMetPowerRequirement()) return
      
    const isSuccessful = item.craft(inventoryInput)
    if (isSuccessful) {
      this.store(item)
    }

    return isSuccessful
  }

}

module.exports = Forge

