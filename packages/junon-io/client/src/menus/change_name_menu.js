const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class ChangeNameMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".change_name_input").addEventListener("keyup", this.onChangeNameInputKeyup.bind(this))
    this.el.querySelector(".set_name_btn").addEventListener("click", this.onSetNameBtnClick.bind(this))
  }

  open(options = {}) {
    super.open(options)

    this.entity = options.entity
    this.render()
  }

  render() {
    this.el.querySelector(".change_name_input").value = this.entity.getName()
  }

  onChangeNameInputKeyup(e) {
    if (e.which === 13) {  // enter
      this.onSetNameBtnClick()
    } else if (e.which === 27) {
      this.close()
    }

  }

  onSetNameBtnClick() {
    let name = this.el.querySelector(".change_name_input").value
    if (this.entity.isBuildingType()) {
      SocketUtil.emit("EditBuilding", { id: this.entity.id, content: name })
    } else if (this.entity.isMob()) {
      SocketUtil.emit("EditMob", { id: this.entity.id, name: name })
    }
  }
}



module.exports = ChangeNameMenu 