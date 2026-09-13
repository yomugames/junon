const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Bars = require("./../bars/index")
const CraftingRules = require("../crafting_rules")

class Furnace extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.getPlacer()) {
      this.getPlacer().progressTutorial("main", 2)
    }
  }

  getConstantsTable() {
    return "Buildings.Furnace"
  }

  getType() {
    return Protocol.definition().BuildingType.Furnace
  }

  canCraft(type) {
    if (this.isFull()) return false

    return CraftingRules.isFurnaceCraftable(type)
  }

  craft(item, inventoryInput) {
    const isSuccessful = item.craft(inventoryInput)
    if (isSuccessful) {
      this.store(item)
    }

    return isSuccessful
  }

}

module.exports = Furnace

