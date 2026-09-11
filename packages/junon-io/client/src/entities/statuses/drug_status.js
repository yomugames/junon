const BaseStatus = require("./base_status")

class DrugStatus extends BaseStatus {
  getStatusName() {
    return "drug"
  }
}

module.exports = DrugStatus
