const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class SecurityCameraMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".camera_feed_navigator").addEventListener("click", this.onCameraFeedClick.bind(this), true)
  }

  open(options = {}) {
    super.open(options)

    this.render()
    this.clickFirstItem()
  }

  clickFirstItem() {
    let cameraFeedItem = this.el.querySelector(".camera_feed_item")
    if (cameraFeedItem && !cameraFeedItem.classList.contains("exit_camera_feed_btn")) {
      this.selectFeed(cameraFeedItem)
    }
  }

  selectFeed(el) {
    let selected = document.querySelector(".camera_feed_item.selected")
    if (selected) {
      selected.classList.remove("selected")
    }

    el.classList.add("selected")
    let id = el.dataset.id

    SocketUtil.emit("ViewCamera", { id: id })
    this.lastActiveFeed = el
  }

  onCameraFeedClick(e) {
    let target = e.target.closest(".camera_feed_item")
    if (!target) return

    if (target.classList.contains("exit_camera_feed_btn")) {
      this.close()
      return
    }

    this.selectFeed(target)
  }

  close(options = {}) {
    super.close(options)

    SocketUtil.emit("ViewCamera", { id: 0 })
    this.game.exitSecurityCameraMode()
  }

  onMenuInteract(cmd) {
    switch(cmd) {
      case "ShiftTab":
        this.onShiftTab()
        break
      case "Tab":
        this.onTab()
        break
      default:
    }
  }

  onShiftTab() {
    this.onTabDirection(-1)
  }

  onTab() {
    this.onTabDirection(1)
  }

  onTabDirection(direction) {
    let tabs = Array.from(this.el.querySelectorAll(".camera_feed_item"))
    if (tabs.length <= 1) return

    let tabIndex = Array.prototype.indexOf.call(tabs, this.lastActiveFeed)
    
    if (direction > 0) {
      // next
      let isLastTab = tabIndex === tabs.length - 2
      if (isLastTab) {
        this.selectFeed(tabs[0])
      } else {
        this.selectFeed(tabs[tabIndex + 1])
      }
    } else {
      let isFirstTab = tabIndex === 0
      if (isFirstTab) {
        this.selectFeed(tabs[tabs.length - 2])
      } else {
        this.selectFeed(tabs[tabIndex - 1])
      }
    }
  }

  render() {
    this.updateCameraFeeds(this.game.sector.cameraFeeds)
  }

  updateCameraFeeds(cameraFeeds) {
    let el = ""

    for (let id in cameraFeeds) {
      let name = cameraFeeds[id].content
      let translated = i18n.t(name)
      el += `<div class='camera_feed_item' data-id='${id}'>${translated}</div>`
    }

    el += `<div class='camera_feed_item exit_camera_feed_btn' data-id='-1'>${i18n.t('ExitCamera')}</div>`

    this.el.querySelector(".camera_feed_navigator").innerHTML = el
  }


}



module.exports = SecurityCameraMenu 