const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const SocketUtil = require("junon-common/socket_util")

class SecurityMonitor extends BaseBuilding {

  isInteractDisabled(user) {
    let room = user.getOccupiedRoom()
    if (!this.isReachableFromRoom(room)) {
      user.showError("Unreachable")
      return true
    }

    return super.isInteractDisabled(user)
  }

  interact(user) {
    SocketUtil.emit(user.getSocket(), "RenderCamera", {})
  }

  getConstantsTable() {
    return "Buildings.SecurityMonitor"
  }

  getType() {
    return Protocol.definition().BuildingType.SecurityMonitor
  }

}

module.exports = SecurityMonitor
