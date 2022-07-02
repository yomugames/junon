const ProducerConsumerNetwork = require("./producer_consumer_network")

class LiquidNetwork extends ProducerConsumerNetwork {
  getResourceName() {
    return "liquid"
  }

}

module.exports = LiquidNetwork
