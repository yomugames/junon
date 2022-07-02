const BaseStatus = require("./base_status")

class ParalyzeStatus extends BaseStatus {
  getStatusName() {
    return "paralyze"
  }
}

module.exports = ParalyzeStatus