const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class WalkthroughMenu extends BaseMenu {

  onMenuConstructed() {
    this.walkthroughIndex = 1
    this.step = "movement"
  }

  isModal() {
    return false
  }

  onCancelBtnClick() {
    document.querySelector("#tutorial_toggle_btn").style.display = 'block'
    this.close()
  }

  update(data) {
    this.walkthroughIndex = data.index
    this.step = data.step
    this.updateText()
  }

  open() {
    this.updateText()

    this.el.style.display = 'block'
  }

  updateText() {
    let content = i18n.t("Walkthrough." + this.step)
    if (!content) {
      content = i18n.t("Walkthrough" + this.walkthroughIndex)
    }
    
    this.el.querySelector(".walthrough_content").innerHTML = content
  }

}

module.exports = WalkthroughMenu