const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseProcessor = require("./base_processor")
const Helper = require('../../../common/helper')

class DeepDrill extends BaseProcessor {

  static isPositionValid(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let isBuildingValid = !this.isOnHangar(container, x, y, w, h) &&
                          !container.armorMap.isOccupied(x, y, w, h) &&
                          !container.structureMap.isOccupied(x, y, w, h)

    let checkFull = false
    let excludeOutOfBounds = false
    const hits = container.groundMap.hitTestTile(this.getBox(x, y, w, h), checkFull, excludeOutOfBounds)
    const isOnOil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("oil") })
    const isNotOnEmptyTile = !hits.find((hit) => { return hit.entity === null })

    return isBuildingValid && isOnOil && isNotOnEmptyTile
  }

  isRPItem() {
    return true;
  }

  getRequiredRP() {
    return 20;
  }

  getConstantsTable() {
    return "Buildings.DeepDrill"
  }

  getType() {
    return Protocol.definition().BuildingType.DeepDrill
  }

  createOutputItem(inputItem) {
    if (this.getResourceStored('fuel') > this.getResourceConsumption('fuel')) {
      this.consumeResource('fuel', this.getResourceConsumption('fuel'))
    } else {
      this.fuelNetwork.consumeResource(this)
    }
      
    let oreOutput = this.getOreOutput()
    let ore = Helper.capitalize(oreOutput) + "Ore"
    return this.sector.createItem(ore, { count: 1 })
  }

  getOreOutput() {
    return "sulfur"
  }
  
  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)
    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  onPowerChanged() {
    super.onPowerChanged()

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  onUsageChanged() {
    super.onUsageChanged()

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  canProceed() {
    if (!this.hasMetPowerRequirement()) return false

    let outputItem = this.getOutputItem()
    if (outputItem && outputItem.isFullyStacked()) return false
    if (!this.fuelNetwork) return false

    if (this.fuelNetwork.getTotalResourceStored() < this.getResourceConsumption('fuel')) {
      return false
    }

    // has fuel..

    return true
  }

  processInputItem() {
    // consume fuel
  }

  getTotalOresStored() {
    let item = this.getOutputItem()
    if (!item) return 0

    return item && item.count
  }

}

module.exports = DeepDrill
