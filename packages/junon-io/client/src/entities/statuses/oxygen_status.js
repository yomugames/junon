const BaseStatus = require("./base_status")

class OxygenStatus extends BaseStatus {
  getStatusName() {
    return "oxygen"
  }
}

module.exports = OxygenStatus