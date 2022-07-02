const Constants = require('../../../common/constants.json')
const ProducerConsumerNetwork = require("./producer_consumer_network")

class PowerNetwork extends ProducerConsumerNetwork {

  getResourceName() {
    return "power"
  }

  executeTurn() {
    const isThreeSecondInterval = this.getGame().timestamp % (Constants.physicsTimeStep * 3) === 0
    if (!isThreeSecondInterval) return

    this.storeAndDrawPower()
  }

  storeAndDrawPower() {
    let totalPowerStored = this.getTotalResourceStored()

    // draw
    for (let key in this.consumers) {
      let consumerHit = this.consumers[key]
      let powerConsumption = consumerHit.entity.getResourceConsumption("power")
      
      if (this.manager.sector.hasInfinitePower()) {
        consumerHit.entity.setPowerStatus(true)
      } else if (powerConsumption <= totalPowerStored) {
        totalPowerStored -= powerConsumption
        consumerHit.entity.setPowerStatus(true)
      } else {
        consumerHit.entity.setPowerStatus(false)
      }
    }

    // store
    for (let key in this.producers) {
      let producerHit = this.producers[key]
      this.storePower(producerHit)
    }
  }

  storePower(producer) {
    let storage

    if (producer.entity.hasCategory("power_storage") && !producer.entity.isResourceFull("power")) {
      storage = producer
      // should only select batteries
      //   storage = Object.values(this.storages).find((storage) => {
      //     return !storage.entity.isResourceFull("power")
      //   })
    }

    if (storage) {
      if (producer.entity.isPowerConverter()) {
        producer.entity.performPowerConversion(storage)
      } else {
        storage.entity.fillResource("power", producer.entity.getResourceProduction("power"))
      }

    }
  }

}

module.exports = PowerNetwork
