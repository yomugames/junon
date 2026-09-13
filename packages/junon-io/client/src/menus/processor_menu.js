const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Item = require("./../entities/item")
const Constants = require("./../../../common/constants.json")

class ProcessorMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initProcessing() {}

  initListeners() {
    super.initListeners()
  }

  close() {
    this.label = null
    if (!this.game.hideMainMenus) {
      this.showQuickInventory()
    }
    super.close()
  }

  onInventoryMouseUp(event) {
    if (this.game.holdItemInventorySlot) return
    const storageId = event.target.closest(".storage").dataset.storageId
    if (parseInt(storageId) === Constants.inventoryStorageId) {
      this.storeInventorySlot(event)
    } else {
      this.retrieveInventorySlot(event)
    }
  }

  onInventoryChanged(data) {
    this.renderPlayerInventory(data)
  }

  hasPlayerInventory() {
    return true
  }

  updateStorageInventory(data) {
    super.updateStorageInventory(data)

    const isProcessorStorage = data.id === this.storageId
    const entity = isProcessorStorage && this.storageId ? this.game.sector.getEntity(this.storageId) : null
    if (entity && typeof entity.setInputStorage === "function" && data.inventory) entity.setInputStorage(data.inventory.storage)

    if (isProcessorStorage && this.progressBar && typeof data.progress === "number") {
      const progressWidth =
        (data.progress / 100) * this.getProgressMaxWidth()
      this.progressBar.style.width = progressWidth + "px"
    }
  }

  getProgressMaxWidth() {
    return 50
  }

  finishOpen() {
    super.open()
  }

  setDescription(description) {
    this.el.querySelector(".menu_description").innerText = i18n.t(description)
  }

  open(header, entity, description, shouldHideInput = false, footer = "", options = {}) {
    this.cleanup()

    this.storageId = entity.id

    // toggle processor mode class
    if (shouldHideInput) {
      this.el.classList.add("processor_output_only")
    } else {
      this.el.classList.remove("processor_output_only")
    }

    Array.from(this.el.querySelectorAll(".input_inventory")).forEach((inputSlot) => {
      inputSlot.style.display = shouldHideInput ? "none" : "inline-block"
    })
    this.el.querySelector(".processor_storage").dataset.storageId = this.storageId
    this.el.querySelector(".menu_main_header").innerText = i18n.t(header)
    this.setDescription(description)

    if (options.disabled) {
      this.isDisabled = true
      this.el.querySelector(".processor_status_message").innerText = i18n.t(options.disabled)
    } else {
      this.isDisabled = false
      this.el.querySelector(".processor_status_message").innerText = ""
    }

    const storageDiv = this.el.querySelector(".processor_storage")
    storageDiv.dataset.storageId = this.storageId
    storageDiv.innerHTML = ""

    const slotCount = entity.getConstants().storageCount
    const outputIndex = slotCount - 1

    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement("div")
      slot.className = "inventory_slot"
      slot.dataset.index = i
      slot.innerHTML = "<img src=''>"

      // hide input slots if output-only
      if (shouldHideInput && i !== outputIndex) {
        slot.style.display = "none"
      }

      storageDiv.appendChild(slot)
      this.initInventorySlotListener(slot)

      // insert progress bar between last input and output
      if (i === outputIndex - 1) {
        const bar = document.createElement("div")
        bar.className = "processor_progress_bar"
        bar.innerHTML = `
          <div class="processor_progress_bar_container">
            <div class="processor_progress_bar_fill"></div>
          </div>
          <div class="arrow-right"></div>
        `
        storageDiv.appendChild(bar)
      }
    }
    this.progressBar = this.el.querySelector(".processor_progress_bar_fill")

    SocketUtil.emit("ViewStorage", { id: this.storageId })

    this.initPlayerInventoryStorage()
    this.initPlayerInventorySlotListeners()
  }


  shouldHideQuickInventory() {
    return true
  }

  cleanup() {
    const storageDiv = this.el.querySelector(".processor_storage")
    const thermalControls = this.el.querySelector(".thermal_processor_controls")
    if (thermalControls) {
      thermalControls.remove()
    }
    storageDiv.dataset.storageId = ""
    this.storageId = null

    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach(slot => {
      this.game.resetInventorySlot(slot)
    })

    if (this.progressBar) {
      this.progressBar.style.width = "0px"
    }

    this.progressBar = null
  }
}

module.exports = ProcessorMenu
