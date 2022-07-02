const BaseStatus = require("./base_status")

class FearStatus extends BaseStatus {
  getStatusName() {
    return "fear"
  }
}

module.exports = FearStatus