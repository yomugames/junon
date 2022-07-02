const Constants = require("./../../../common/constants.json")
const BaseMenu = require("./base_menu")

class StatusListMenu extends BaseMenu {

  onMenuConstructed() {
    this.statuses = {}
  }

  isAlwaysOpen() {
    return true
  }

  isModal() {
    return false
  }


  addStatus(effect) {
    if (this.statuses[effect]) return

    this.statuses[effect] = true

    let effectId = effect + "_effect"
    let imgPath = effectId + ".png"

    let entry = "<div class='status_list_entry' id='" + effectId + "'>" +
      "<img src='/assets/images/" + imgPath + "' />" +
    "</div>"

    this.el.innerHTML += entry
  }

  removeStatus(effect) {
    delete this.statuses[effect]

    let effectId = effect + "_effect"
    let entry = this.el.querySelector("#" + effectId)
    if (entry && entry.parentElement) {
      entry.parentElement.removeChild(entry)
    }
  }

  cleanup() {
    this.el.innerHTML = ""
  }

}

module.exports = StatusListMenu
