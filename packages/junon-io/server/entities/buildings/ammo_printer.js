const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Ammos = require("./../ammos/index")
const CraftingRules = require("../crafting_rules")

class AmmoPrinter extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.AmmoPrinter"
  }

  getType() {
    return Protocol.definition().BuildingType.AmmoPrinter
  }

  canCraft(type) {
    if (this.isFull()) return false

    return CraftingRules.isAmmoPrinterCraftable(type)
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

module.exports = AmmoPrinter

