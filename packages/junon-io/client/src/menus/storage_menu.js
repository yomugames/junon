const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class StorageMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()
  }

  initInventorySlotListeners() {
    let elements = this.el.querySelectorAll("#storage_inventory .inventory_slot")
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      this.initInventorySlotListener(el)
    }
  }

  onInventoryChanged(data) {
    this.renderPlayerInventory(data)
  }

  hasPlayerInventory() {
    return true
  }

  onInventoryMouseUp(e) {
    if (this.game.holdItemInventorySlot) return
    
    let isPlayerInventorySlot = parseInt(e.target.closest(".storage").dataset.storageId) === Constants.inventoryStorageId
    if (isPlayerInventorySlot) {
      this.storeInventorySlot(e)
    } else {
      this.retrieveInventorySlot(e)
    }
  }

  isStorageMenu() {
    return true
  }

  // response open
  finishOpen() {
    super.open()
    this.cleanup()

    this.el.querySelector(".storage").dataset.storageId = this.entity.id

    if (this.label) {
      this.el.querySelector(".menu_main_header").innerText = this.label
    }

    let menuDescription = this.entity.getMenuDescription()
    if (menuDescription) {
      this.el.querySelector(".menu_description").innerText = i18n.t(menuDescription)
    } else {
      this.el.querySelector(".menu_description").innerText = ""
    }

    this.initStorage()
    this.initInventorySlotListeners()

    this.initPlayerInventoryStorage()
    this.initPlayerInventorySlotListeners()
  }

  shouldHideQuickInventory() {
    return true
  }

  // request open
  open(label, entity) {
    this.entity = entity
    this.storageId = entity.id
    this.label = i18n.t(label)

    SocketUtil.emit("ViewStorage", { id: this.entity.id })
  }

  close() {
    this.label = null
    
    if (!this.game.hideMainMenus) {
      this.showQuickInventory()
    }
    
    super.close()
  }

  cleanup() {
    this.el.querySelector(".storage").dataset.storageId = ""

    // we want to create slots as it should be limited to amount of slots for target entity
    this.el.querySelector(".storage").innerHTML = ""
  }

  initStorage() {
    this.el.querySelector("#storage_inventory").innerHTML = this.createInventorySlots(this.entity.getStorageCount())
  }

}



module.exports = StorageMenu
