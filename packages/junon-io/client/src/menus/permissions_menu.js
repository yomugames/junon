const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class PermissionsMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".allow_access_select").addEventListener("change", this.onAllowAccessSelectChanged.bind(this))
  }

  open(options = {}) {
    super.open(options)

    this.entity = options.entity
    this.render()
  }

  render() {
    this.createOptions()

    if (this.entity.accessType !== 'undefined') {
      this.el.querySelector(".allow_access_select").value = this.entity.accessType
    }
  }

  onAllowAccessSelectChanged(e) {
    let value = e.target.value
    SocketUtil.emit("EditBuilding", { id: this.entity.id, accessType: value })
  }

  createOptions() {
    this.el.querySelector(".allow_access_select").innerHTML = ""

    let options = "<option value='2'>" + i18n.t('Admin') + "</option>" + 
                  "<option value='1'>" + i18n.t('Members') + "</option>" +
                  "<option value='0'>" + i18n.t('Everyone') + "</option>"

    this.el.querySelector(".allow_access_select").innerHTML += options
  }


}



module.exports = PermissionsMenu 