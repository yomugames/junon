const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class OxygenGenerator extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()
    this.container.addProcessor(this)

    this.getPlacer() && this.getPlacer().progressTutorial("main", 4)
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  executeTurn() {
    // same rate as player oxygen consumption
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * Constants.oxygenProductionConsumptionRate) === 0
    if (!isThreeSecondInterval) return

    this.convertWaterToOxygen()
  }

  interact(user) {
    let handEquipment = user.getHandEquipment()

    if (handEquipment && handEquipment.getType() === Protocol.definition().BuildingType.WaterBottle) {
      // when you do fill, count as 1 operation. dont make armor request oxygen
      if (handEquipment.hasEnoughWater()) {
        const oxygenNetwork = this.getOxygenNetwork()
        oxygenNetwork.fillResource(handEquipment)
        handEquipment.drainSample()

        this.getPlacer() && this.getPlacer().progressTutorial("main", 6)
        if (user && user.isPlayer()) {
          user.walkthroughManager.handle("fill_oxygen_generator")
        } 
        return
      }
    }

    let armorEquipment = user.getArmorEquipment()
    if (armorEquipment && armorEquipment.hasOxygen()) {
      let amount = armorEquipment.getUnfilledOxygen()
      let amountDrained = this.consumeResource("oxygen", amount)
      if (amountDrained > 0) {
        armorEquipment.setOxygen(armorEquipment.oxygen + amountDrained, user)
        this.getPlacer() && this.getPlacer().progressTutorial("main", 7)
        if (user && user.isPlayer()) {
          user.walkthroughManager.handle("refill_space_suit")
        }
      }
    }

  }

  convertWaterToOxygen() {
    const liquidNetwork = this.getLiquidNetwork()
    const oxygenNetwork = this.getOxygenNetwork()

    if (!oxygenNetwork) return
    if (!oxygenNetwork.hasAvailableStorage()) return
    if (!liquidNetwork) return

    if (liquidNetwork.hasEnoughStored()) {
      let amountDrained = liquidNetwork.consumeResource(this)
      if (amountDrained > 0) {
        oxygenNetwork.fillResource(this)
      }
    }

  }

  onUsageChanged(resource, usage) {
    super.onUsageChanged(resource, usage)

    if (this.room) {
      if (this.room.oxygenPercentageWillNotChange(this)) return

      this.room.getConnectedRoomsViaOxygenNetwork().forEach((room) => {
        room.assignOxygenPercentage()
      })
    }
  }

  getConstantsTable() {
    return "Buildings.OxygenGenerator"
  }

  onNetworkAssignmentChanged(networkName) {
    super.onNetworkAssignmentChanged(networkName)

    if (networkName === 'liquidNetwork') {
      if (this.getOwner() && this.getOwner().isPlayer()) {
        this.getOwner().walkthroughManager.handle("connect_liquid_pipe", { oxygenGenerator: this })
      }
    }
  }

  getType() {
    return Protocol.definition().BuildingType.OxygenGenerator
  }

}

module.exports = OxygenGenerator

