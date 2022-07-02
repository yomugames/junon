const BaseStatus = require("./base_status")

class ThirstStatus extends BaseStatus {
  getStatusName() {
    return "thirst"
  }
}

module.exports = ThirstStatus