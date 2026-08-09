const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class FuelTank extends BaseBuilding {

  interact(user) {
    let handEquipment = user.getHandEquipment()

    let refueableEquipments = [Protocol.definition().BuildingType.Lighter, Protocol.definition().BuildingType.FlameThrower]

    if (handEquipment && refueableEquipments.indexOf(handEquipment.getType()) !== -1) {
      let amount = this.consumeResource("fuel", Math.min(this.getResourceStored("fuel"), handEquipment.getUsageCapacity()))
      handEquipment.setUsage(handEquipment.getUsage() + amount)
    }
  }

  getConstantsTable() {
    return "Buildings.FuelTank"
  }

  getType() {
    return Protocol.definition().BuildingType.FuelTank
  }

  getUsageCapacity() {
    return this.getResourceCapacity("fuel")
  }

}

module.exports = FuelTank

