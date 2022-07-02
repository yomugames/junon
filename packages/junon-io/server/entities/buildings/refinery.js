const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseProcessor = require("./base_processor")
const Bars = require("./../bars/index")

class Refinery extends BaseProcessor {

  onConstructionFinished() {
    super.onConstructionFinished()

  }

  getConstantsTable() {
    return "Buildings.Refinery"
  }

  canProceed() {
    // deprecated
    return false

    let outputItem = this.getOutputItem()
    if (outputItem && outputItem.isFullyStacked()) return false
      
    return this.hasMetPowerRequirement() && this.getInputItem()
  }

  onPowerChanged() {
    super.onPowerChanged()

    if (this.isPowered) {
      // this.container.addProcessor(this)
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Refinery
  }

  isProcessable(inputItem) {
    return inputItem.isOre() || inputItem.isBar()
  }

  createOutputItem(inputItem) {
    // return this.sector.createItem("Gold", { count: Math.floor(inputItem.getCost() / 2) })
  }

}

module.exports = Refinery


