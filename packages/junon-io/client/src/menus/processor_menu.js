const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Item = require("./../entities/item")

class ProcessorMenu extends BaseMenu {
  onMenuConstructed() {
    this.progressBar = this.el.querySelector(".processor_progress_bar_fill")
  }

  initProcessing() {
  }

  initListeners() {
    super.initListeners()

    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach((el) => {
      this.initInventorySlotListener(el)
      el.addEventListener("click", this.onInventoryClick.bind(this), true)
    })
  }

  close() {
    this.label = null
    
    if (!this.game.hideMainMenus) {
      this.showQuickInventory()
    }
    
    super.close()
  }


  onInventoryClick(event) {
    this.retrieveInventorySlot(event)
  }

  onInventoryChanged(data) {
    this.renderPlayerInventory(data)
  }

  hasPlayerInventory() {
    return true
  }

  updateStorageInventory(data) {
    super.updateStorageInventory(data)

    let progressWidth = data.progress / 100 * this.getProgressMaxWidth()
    this.progressBar.style.width = progressWidth + "px"
  }

  getProgressMaxWidth() {
    return 50
  }

  finishOpen() {
    super.open()
  }

  open(header, entity, description, shouldHideInput = false, footer = "", options = {}) {
    this.cleanup()

    this.storageId = entity.id

    if (shouldHideInput) {
      this.el.classList.add("processor_output_only")
    } else {
      this.el.classList.remove("processor_output_only")
    }

    this.el.querySelector(".input_inventory").style.display = shouldHideInput ? "none" : "inline-block"
    this.el.querySelector(".processor_storage").dataset.storageId = this.storageId
    this.el.querySelector(".menu_main_header").innerText = i18n.t(header)
    this.el.querySelector(".menu_description").innerText = i18n.t(description)

    if (options.disabled) {
      this.isDisabled = true
      this.el.querySelector(".processor_status_message").innerText = i18n.t(options.disabled)
    } else {
      this.isDisabled = false
      this.el.querySelector(".processor_status_message").innerText = ""
    }

    SocketUtil.emit("ViewStorage", { id: this.storageId })

    this.initPlayerInventoryStorage()
    this.initPlayerInventorySlotListeners()
  }

  shouldHideQuickInventory() {
    return true
  }

  cleanup() {
    this.el.querySelector(".processor_storage").dataset.storageId = ""
    this.storageId = null

    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach((inventorySlot) => {
      this.game.resetInventorySlot(inventorySlot)
    })

    this.progressBar.style.width = "0px"
  }

}



module.exports = ProcessorMenu
