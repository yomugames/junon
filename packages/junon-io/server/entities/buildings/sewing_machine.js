const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SewingMachine extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.SewingMachine"
  }

  getType() {
    return Protocol.definition().BuildingType.SewingMachine
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

module.exports = SewingMachine

