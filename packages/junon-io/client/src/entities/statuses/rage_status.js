const BaseStatus = require("./base_status")

class RageStatus extends BaseStatus {
  getStatusName() {
    return "rage"
  }
}

module.exports = RageStatus