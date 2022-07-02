const Inventory = require("./inventory")
const Protocol = require('../../common/util/protocol')
const Constants = require('../../common/constants')

class EquipmentInventory extends Inventory {
  getId() {
    return Constants.equipmentStorageId
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot
    if (!item.isEquipment()) return false

    let role = index
    const isWrongEquipmentSlot = item.getEquipmentRole() !== role
    if (isWrongEquipmentSlot) return false

    return true
  }

  onStorageChanged(item, index, previousItem) {
    this.user.onEquipmentStorageChanged(item, index, previousItem)  
  }

  isEquipmentStorage() {
    return true
  }

}

module.exports = EquipmentInventory