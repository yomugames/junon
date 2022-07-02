const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")


class ConfirmMenu extends BaseMenu {
  onMenuConstructed() {
    document.querySelector(".confirm_cancel_btn").addEventListener("click", this.onCancelClick.bind(this), true)
    document.querySelector(".confirm_ok_btn").addEventListener("click", this.onOkClick.bind(this), true)
  }

  isControllingPlayerRequired() {
    return false
  }

  onCancelClick() {
    this.close()

    if (this.cancelCallback) {
      this.cancelCallback()
    }
  }

  onOkClick() {
    this.close()

    if (this.proceedCallback) {
      this.proceedCallback.call()
    }
  }

  open(options = {}) {
    super.open(options)
  
    document.querySelector(".confirm_message").innerText = options.message

    this.proceedCallback = options.proceedCallback
    this.cancelCallback  = options.cancelCallback
  }

}

module.exports = ConfirmMenu
