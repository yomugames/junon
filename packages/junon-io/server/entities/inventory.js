const Storable = require('../../common/interfaces/storable')
const Constants = require('../../common/constants')

class Inventory {
  constructor(user, numItems) {
    this.user = user
    this.initStorable(numItems)
  }

  getId() {
    return Constants.inventoryStorageId
  }

  getType() {
    return 0
  }

  isCraftingStorage() {
    return true
  }

  hasCategory(category) {
    return false
  }

  canCraft() {
    if (this.isFull()) return false

    return true
  }

  isBuildingStorage() {
    return false
  }

  isSandboxMode() {
    if (debugMode && this.user.isAdminMode) return true

    if (this.user.game.isPeaceful()) return true
    return false
  }

  craft(item, inventoryInput) {
    const isSuccessful = item.craft(inventoryInput)
    const isSandboxModeAndOwner = this.isSandboxMode() && this.user.isSectorOwner()

    if (isSuccessful || isSandboxModeAndOwner) {
      if (item.isOre() || item.isBar()) {
        let isAbleToStorInRegularInventory = this.store(item, Constants.regularInventoryBaseIndex)
        if (!isAbleToStorInRegularInventory) {
          return this.store(item)
        } else {
          return true
        }
      } else {
        return this.store(item)
      }
    } else {
      if (this.user.isPlayer()) {
        let failReason = item.getFailureReason()
        if (failReason) {
          this.user.showError(failReason, { isWarning: true })
        } else {
          this.user.showError("Not enough Ingredients", { isWarning: true })
        }
      }
      return false
    }
  }


  isInventory() {
    return true
  }

  isSector() {
    return false
  }

}

Object.assign(Inventory.prototype, Storable.prototype, {
  onStorageChanged(item, index, previousItem) {
    this.user.onInventoryStorageChanged(item, index, previousItem)  
  }
})


module.exports = Inventory