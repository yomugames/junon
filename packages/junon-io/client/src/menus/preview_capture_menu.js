const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class PreviewCaptureMenu extends BaseMenu {

  onMenuConstructed() {
  }

  isModal() {
    return true
  }

  onCancelBtnClick() {
    this.close()
  }

}

module.exports = PreviewCaptureMenu