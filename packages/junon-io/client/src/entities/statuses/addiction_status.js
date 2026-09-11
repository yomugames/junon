const BaseStatus = require("./base_status")

class AddictionStatus extends BaseStatus {
  getStatusName() {
    return "addiction"
  }
}

module.exports = AddictionStatus
