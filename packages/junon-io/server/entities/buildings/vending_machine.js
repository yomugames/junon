const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class VendingMachine extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.purchaseHistory = {}
    if (!this.prices) this.prices = {}
    this.container.addProcessor(this)
  }

  remove() {
    this.container.removeProcessor(this)
    super.remove()
  }

  withdraw(player) {
    let canWithdraw = player.isAdmin() && player.getTeam() === this.getOwner()
    if (!canWithdraw) {
      player.showError("Not allowed", { isWarning: true })
      return
    }

    let storedGold = parseInt(this.content)
    if (isNaN(storedGold)) storedGold = 0

    player.increaseGold(storedGold)
    this.setGold(0)
  }

  addPurchaseHistory(player, type) {
    this.purchaseHistory[player.getId()] = this.purchaseHistory[player.getId()] || {} 
    this.purchaseHistory[player.getId()][type] = this.purchaseHistory[player.getId()][type] || { count: 0 }

    this.purchaseHistory[player.getId()][type].count += 1
    this.purchaseHistory[player.getId()][type].timestamp += this.game.timestamp
  }

  getPurchaseHistory(player, type) {
    this.purchaseHistory[player.getId()] = this.purchaseHistory[player.getId()] || {} 

    return this.purchaseHistory[player.getId()][type] 
  }

  // todo: cleanup purchaseHistory onDayChanged..
  resetPurchaseHistory() {
    this.purchaseHistory = {}
  }

  validateSellable(customer, itemSold, count) {
    if (itemSold.count < count) {
      return { error: "Out of stock" }
    }

    let purchaseHistory = this.getPurchaseHistory(customer, itemSold.type)
    if (purchaseHistory) {
      if (purchaseHistory.count >= 3) {
        return { error: i18n.t(customer.locale,"BoughtTooMuch") }
      }
    }

    return {}
  }

  changePrice(data) {
    this.prices[data.itemId] = data.cost
    this.onStateChanged("prices")
  }

  // remove prices for items that are no longer in vending machine
  // can't use onStorageChanged as index changes will remove it... :(
  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return
    if (!this.prices || Object.keys(this.prices).length === 0) return

    for (let itemId of Object.keys(this.prices)) {
      let item = this.game.getEntity(itemId)

      if (!item || !Object.values(this.storage).includes(item)) {
        delete this.prices[itemId]
        if(Object.keys(this.prices).length === 0) {
          this.prices.empty = 0 // use this to clear prices
        } else {
          delete this.prices.empty
        }
        this.onStateChanged("prices")
      }
    }
  }

}

module.exports = VendingMachine
