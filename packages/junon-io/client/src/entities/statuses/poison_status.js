const BaseStatus = require("./base_status")

class PoisonStatus extends BaseStatus {
  getStatusName() {
    return "poison"
  }
}

module.exports = PoisonStatus