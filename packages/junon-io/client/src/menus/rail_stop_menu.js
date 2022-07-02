const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class RailStopMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".destination_list").addEventListener("click", this.onDestinationListClick.bind(this))

    this.el.querySelector(".rename_btn").addEventListener("click", this.onRenameBtnClick.bind(this))
    this.el.querySelector(".stop_name_input").addEventListener("blur", this.onStopNameInputBlur.bind(this))
    this.el.querySelector(".stop_name_input").addEventListener("keyup", this.onStopNameInputKeyup.bind(this))

    this.el.querySelector(".go_destination_btn").addEventListener("click", this.onGoBtnClick.bind(this))
  }

  onMenuInteract(cmd) {
    switch(cmd) {
      case "EnterUp":
        this.onEnterUp()
        break
    }
  }

  onEnterUp() {
    this.onGoBtnClick()    
  }

  onDestinationListClick(e) {
    let choice = e.target.closest(".rail_destination_item")
    if (choice) {
      if (this.selectedChoice) {
        this.selectedChoice.classList.remove("selected")
      }

      this.selectedChoice = choice
      this.selectedChoice.classList.add("selected")

      this.el.querySelector(".go_destination_btn").dataset.disabled = ''
    }
  }

  open(options = {}) {
    super.open(options)

    // clear destinations. always fetch from server
    this.el.querySelector(".destination_list").innerHTML = ''

    this.entity = options.entity
    this.render(this.entity)

    this.hideStopNameInput()
    this.el.querySelector(".go_destination_btn").dataset.disabled = 'true'

    if (options.disabled) {
      this.isDisabled = true
      this.el.querySelector("#rail_status_message").innerText = i18n.t(options.disabled)
    } else {
      this.isDisabled = false
      this.el.querySelector("#rail_status_message").innerText = ""
    }

    if (this.entity.isPowered) {
      SocketUtil.emit("InteractTarget", { id: this.entity.id, action: "view" })
    }
  }

  render(stop) {
    this.stopName = stop.getStopName()
    this.el.querySelector(".stop_info_name").innerText = i18n.t(this.stopName)

    this.renderRenameBtn(stop, this.game.player.getTeam()) 
  }

  renderDestinations(data) {
    if (Object.keys(data.destinationMap).length === 0) {
      let el = "<div class='empty_destination_message'>No Destinations Found</div>"
      this.el.querySelector(".destination_list").innerHTML = el
      return
    }

    for (let stopId in data.destinationMap) {
      let stopName = data.destinationMap[stopId]
      const div = document.createElement("div")
      div.className = "rail_destination_item"
      div.dataset.id = stopId

      if (stopName.replace(/\s+/,'').length === 0) {
        div.innerText = "(" + i18n.t('Unnamed') + ")"
      } else {
        div.innerText = i18n.t(stopName)
      }
      
      this.el.querySelector(".destination_list").appendChild(div)
    }
  }


  onRenameBtnClick(e) {
    let renameBtn = e.target.closest(".rename_btn")
    if (renameBtn) {
      this.showStopNameInput()
    } 
  }

  onGoBtnClick() {
    if (!this.selectedChoice) return
    if (this.disabled) return

    let action = "travel:" + this.selectedChoice.dataset.id
    SocketUtil.emit("InteractTarget", { id: this.entity.id, action: action })

    this.close()
  }

  showStopNameInput() {
    this.el.querySelector(".stop_info_name").style.display = 'none'
    this.el.querySelector(".stop_name_input").style.display = 'inline-block'
    this.el.querySelector(".stop_name_input").value = this.stopName
    this.el.querySelector(".stop_name_input").focus()
  }

  hideStopNameInput() {
    this.el.querySelector(".stop_info_name").style.display = 'inline-block'
    this.el.querySelector(".stop_name_input").style.display = 'none'
  }

  onStopNameInputBlur(e) {
    this.setStopName(e.target.value)
    this.hideStopNameInput()
  }

  onStopNameInputKeyup(e) {
    if (e.which === 13 || e.which === 27) { // enter or esc
      this.setStopName(e.target.value)
      e.target.blur()
      this.hideStopNameInput()
    }
  }

  setStopName(name) {
    SocketUtil.emit("EditBuilding", { id: this.entity.id, content: name })
  }

  cleanup() {
    this.el.querySelector(".destination_list").innerHTML = ""
  }

  renderRenameBtn(stop, team) {
    if (this.game.isLeaderAndOwner(stop, team, this.game.player)) {
      this.el.querySelector(".rename_btn").style.display = 'inline-block'
    } else {
      this.el.querySelector(".rename_btn").style.display = 'none'
    }
  }


}



module.exports = RailStopMenu 