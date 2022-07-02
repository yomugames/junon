const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")


class VentMenu extends BaseMenu {
  onMenuConstructed() {
  }

  isControllingPlayerRequired() {
    return true
  }

  open(options = {}) {
    super.open()
  
  }

}

module.exports = VentMenu
