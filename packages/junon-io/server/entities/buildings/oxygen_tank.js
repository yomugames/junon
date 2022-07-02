const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const SocketUtil = require("junon-common/socket_util")

class OxygenTank extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.OxygenTank"
  }

  getType() {
    return Protocol.definition().BuildingType.OxygenTank
  }

  interact(user) {
    let armorEquipment = user.getArmorEquipment()
    if (armorEquipment && armorEquipment.hasOxygen()) {
      let amount = armorEquipment.getUnfilledOxygen()
      let amountDrained = this.consumeResource("oxygen", amount)
      if (amountDrained > 0) {
        armorEquipment.setOxygen(armorEquipment.oxygen + amountDrained, user)
      }
    }
  }

  onUsageChanged() {
    super.onUsageChanged()
    
    if (this.room) {
      if (this.room.oxygenPercentageWillNotChange(this)) return

      this.room.getConnectedRoomsViaOxygenNetwork().forEach((room) => {
        room.assignOxygenPercentage()
      })
    }
  }

}

module.exports = OxygenTank

