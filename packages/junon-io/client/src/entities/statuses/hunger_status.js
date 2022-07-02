const BaseStatus = require("./base_status")

class HungerStatus extends BaseStatus {
  getStatusName() {
    return "hunger"
  }

}

module.exports = HungerStatus