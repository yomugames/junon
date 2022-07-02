const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class PowerGenerator extends BaseBuilding {

  isPowerConverter() {
    return true
  }

  performPowerConversion(storage) {
    this.convertFuelToPower(storage)
  }

  convertFuelToPower(storage) {
    const fuelNetwork = this.getFuelNetwork()
    if (fuelNetwork && fuelNetwork.hasEnoughStored(this.getResourceConsumption("fuel"))) {
      let amountDrained = fuelNetwork.consumeResource(this)
      if (amountDrained > 0) {
        storage.entity.fillResource("power", this.getResourceProduction("power"))
      }
    }
  }

  getConstantsTable() {
    return "Buildings.PowerGenerator"
  }

  getType() {
    return Protocol.definition().BuildingType.PowerGenerator
  }

}

module.exports = PowerGenerator

