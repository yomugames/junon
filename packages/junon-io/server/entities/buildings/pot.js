const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Pot extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Pot"
  }

  getType() {
    return Protocol.definition().BuildingType.Pot
  }

  interact(user) {
    let canInteractWithPot = this.isOwnedBy(user.getTeam()) && user.isAdmin()
    if (!canInteractWithPot) return

    // pot has flower
    let storedItem = this.get(0)
    if (storedItem) {
      // check if user has enough inventory space
      if (!user.inventory.isFull(storedItem.getType())) {
        this.removeItem(storedItem)
        user.inventory.store(storedItem)
      }
      
      return
    }

    // pot is empty
    let handItem = user.getHandItem()
    if (handItem && handItem.isFlower()) {
      user.retrieveHandItem()
      let inventoryItem = user.inventory.get(user.equipIndex)
      inventoryItem.consume()
      this.store(handItem)
    } else {
      user.showError("Flower required")
    }
  }

  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)

    this.content = this.getStorageContentType()
    
    this.onStateChanged("content")
  }

  getStorageContentType() {
    let item = this.get(0)
    if (!item) return ""

    return item.type.toString()
  }

}

module.exports = Pot
