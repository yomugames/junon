const BaseStatus = require("./base_status")

class DrankStatus extends BaseStatus {
  getStatusName() {
    return "drunk"
  }
}

module.exports = DrankStatus