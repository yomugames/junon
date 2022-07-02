const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class VendingMachine extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.purchaseHistory = {}
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

}

module.exports = VendingMachine

