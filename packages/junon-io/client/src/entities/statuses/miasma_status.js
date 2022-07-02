const BaseStatus = require("./base_status")

class MiasmaStatus extends BaseStatus {
  getStatusName() {
    return "miasma"
  }
}

module.exports = MiasmaStatus