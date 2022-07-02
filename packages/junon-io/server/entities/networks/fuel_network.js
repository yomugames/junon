const ProducerConsumerNetwork = require("./producer_consumer_network")

class FuelNetwork extends ProducerConsumerNetwork {

  getResourceName() {
    return "fuel"
  }

}

module.exports = FuelNetwork
