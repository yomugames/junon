const SocketUtil = require("./../util/socket_util")
const StorageMenu = require("./storage_menu")

class OxygenTankMenu extends StorageMenu {
  initStorage() {
    this.el.querySelector(".storage").innerHTML = this.createInventorySlots(2)
  }

  open(entity) {
    super.open(null, entity.id)

    this.entity = entity
  }

  initListeners() {
    super.initListeners()

    let elements = Array.from(this.el.querySelectorAll(".inventory_slot"))
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      this.initInventorySlotListener(el)
    }

  }

}



module.exports = OxygenTankMenu
