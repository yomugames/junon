const BaseStatus = require("./base_status")

class StaminaStatus extends BaseStatus {
  getStatusName() {
    return "stamina"
  }

  getStatusTint() {
    return 0xd47323
  }

}

module.exports = StaminaStatus