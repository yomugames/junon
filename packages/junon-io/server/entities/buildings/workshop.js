const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const CraftingRules = require("../crafting_rules")

class Workshop extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Workshop"
  }

  getType() {
    return Protocol.definition().BuildingType.Workshop
  }

  canCraft(type) {
    if (this.isFull()) return false

    return CraftingRules.isWorkshopCraftable(type)
  }

  craft(item, inventoryInput) {
    const isSuccessful = item.craft(inventoryInput)
    if (isSuccessful) {
      this.store(item)
    }

    return isSuccessful
  }

}

module.exports = Workshop

