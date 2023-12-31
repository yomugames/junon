const Buildings = require("./buildings/index")
const Equipments = require("./equipments/index")
const Ores = require("./ores/index")
const Bars = require("./bars/index")
const Foods = require("./foods/index")
const Drinks = require("./drinks/index")
const Ammos = require("./ammos/index")
const Mobs = require("./mobs/index")
const Item = require("./item")
const Helper = require("./../../common/helper")
const Protocol = require('../../common/util/protocol')

const Constants = require('../../common/constants.json')

class TradeOrder {

  static create(options = {}) {
    let klassGroup = this.getGroup(options.group)
    if (!klassGroup) return

    let klass = klassGroup.forType(options.type)
    if (!klass) return

    options.klass = klass

    return new TradeOrder(options)
  }

  constructor(options = {}) {
    this.sector = options.customer.sector
    this.game = this.sector.game
    this.customer = options.customer
    this.klass = options.klass
    this.type = options.type
    this.count = options.count || 1
    this.index = options.index
    this.tradeType = options.sell ? "sell" : "buy"
    this.recipientId = options.recipientId
    this.entityId = options.id

    let recipient = this.customer.game.getEntity(options.recipientId)
    if (recipient && recipient.hasCategory("seller")) {
      this.seller = recipient

      // vending machine count should always be 1
      if (this.seller.hasCategory("vending_machine")) {
        this.count = 1
      }
    }


  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  canBuy() {
    if (this.isSoldByTrader()) {
      let sellable = this.sector.sellables[this.klass.prototype.getTypeName()]
      if (sellable && sellable.itemName) {
        let purchaseCost = sellable.cost * this.count
        let requirementType = Protocol.definition().BuildingType[sellable.itemName]
        let inventoryItemCount = this.customer.inventory.getItemCount(requirementType)
        return inventoryItemCount >= purchaseCost
      }
    }

    return this.customer.gold >= this.getTotalPurchaseCost()
  }

  canSell() {
    let requirementsMet = false

    let countRequired = this.count
    for (let index in this.customer.getSellStorage()) {
      let item = this.customer.getSellStorage()[index]
      if (item.type === this.type) {
        countRequired -= item.count
      }

      if (countRequired <= 0) {
        requirementsMet = true
        break
      }
    }

    return requirementsMet
  }

  getTotalSellCost() {
    if (this.isSoldByTrader()) {
      let purchasable = this.sector.purchasables[this.klass.prototype.getTypeName()]
      if (purchasable) {
        return purchasable.cost * this.count
      } else {
        return Math.ceil(this.klass.getCost() / 2) * this.count
      }
    } else {
      return Math.ceil(this.klass.getCost() / 2) * this.count
    }
  }

  getTotalPurchaseCost() {
    if (this.isSoldByTrader()) {
      let sellable = this.sector.sellables[this.klass.prototype.getTypeName()]
      if (sellable) {
        return sellable.cost * this.count
      } else {
        return this.klass.getCost() * this.count
      }
    } else {
      return this.klass.getCost() * this.count
    }
  }

  isSoldByTrader() {
    return this.recipientId <= 0
  }

  validatePurchasable() {
    if (!this.customer.getTeam()) return false

    if (this.sector.isMobLimitExceeded()) {
      this.customer.showError("Mob Limit Reached")
      return false
    }

    if (this.klass.prototype.isTamable()) {
      if (this.customer.getTeam().isTameLimitReached(this.count)) {
        if (this.game.timestamp - this.customer.tameLimitErrorShown > (Constants.physicsTimeStep * 5)) {
          this.customer.tameLimitErrorShown = this.game.timestamp
          this.customer.showError("Pet Limit Reached")
        }
        return false
      }
    }

    if (this.klass.prototype.hasCategory('worker')) {
      if (this.customer.getTeam().isSlaveLimitReached(this.count)) {
        if (this.game.timestamp - this.customer.tameLimitErrorShown > (Constants.physicsTimeStep * 5)) {
          this.customer.tameLimitErrorShown = this.game.timestamp
          this.customer.showError("Slave Limit Reached")
        }
        return false
      }
    }

    if (this.klass.prototype.hasCategory('bot')) {
      if (this.customer.getTeam().isBotLimitReached(this.count)) {
        if (this.game.timestamp - this.customer.tameLimitErrorShown > (Constants.physicsTimeStep * 5)) {
          this.customer.tameLimitErrorShown = this.game.timestamp
          this.customer.showError("Bot Limit Reached")
        }
        return false
      }
    }

    return true
  }

  execute() {
    if (this.tradeType === "sell") {
      this.executeSell()
    } else {
      this.executeBuy()
    }
  }

  hasSellPrivilege(player) {
    if (!player.getTeam()) return false

    return player.getRole().isAllowedTo("SellToTrader")
  }

  executeSell() {
    let typeName = this.getPurchaseTypeName()
    if (typeName === "Gold") return

    let itemValid;
    for(item of this.sector.sellables) {
      if(item.constructor.name == typeName) itemValid = true
    }
    if(!itemValid) {
      for(mob of this.sector.mobs) {
        if(mob.constructor.name == itemType) itemValid = true
      }
    }



    if(!itemValid) return

    if (!this.hasSellPrivilege(this.customer)) {
      this.customer.showError("You dont have permission to sell", { isWarning: true })
      return
    }

    if (this.entityId) {
      let entity = this.game.getEntity(this.entityId)
      if (!entity) return

      if(!entity.isMob()) return

      entity.remove()
    } else {
      if (this.sector.isCustomSell) {
        let purchasable = this.sector.purchasables[this.klass.prototype.getTypeName()]
        if (!purchasable) return

        let itemCount = this.customer.inventory.getItemCount(this.type)
        if (itemCount < this.count) {
          this.customer.showError("Not enough items available", { isWarning: true })
          return
        }

        let items = this.customer.inventory.filter(this.type)
        let remainingCount = this.count
        while (remainingCount > 0 && items.length > 0) {
          let item = items.shift()
          let amountToReduce = item.count > remainingCount ? remainingCount : item.count
          remainingCount -= amountToReduce
          item.reduceCount(amountToReduce)
        }

      } else {
        let item = this.customer.getSellStorage()[this.index]
        if (!item) return

        if (item.count < this.count) {
          this.customer.showError("Not enough items available", { isWarning: true })
          return
        }

        item.reduceCount(this.count)
      }
    }

    const goldAmount = this.getTotalSellCost()
    this.customer.increaseGold(goldAmount)

    this.game.triggerEvent("ItemSell", {
      playerId: this.customer.id,
      player: this.customer.name,
      itemType: typeName,
      count: this.count
    })
    this.getSocketUtil().emit(this.customer.getSocket(), "CraftSuccess", { name: "Gold", count: goldAmount })
  }

  isPurchasableFromTrader(klass) {
    if (this.klass.prototype.hasCategory('worker')) return true
    return this.sector.sellables[klass.prototype.getTypeName()]
  }

  executeBuy() {
    if (!this.canBuy()) {
      this.customer.showError("Not enough Resource", { isWarning: true })
      return
    }

    let operations = []
    let itemSold

    if (this.seller) {
      itemSold = this.seller.getSellStorage()[this.index]
      if (!itemSold) return

      let validation = this.seller.validateSellable(this.customer, itemSold, this.count)

      if (validation.error) {
        this.customer.showError(validation.error, { isWarning: true })
        return
      }
    }

    let product
    if (this.isSoldByTrader() && !this.isPurchasableFromTrader(this.klass)) return

    if (this.klass.prototype.isMob()) {

      let shouldProceed = this.validatePurchasable()
      if (!shouldProceed) return

      let mobs = this.sector.spawnMob({
        type: this.klass.name,
        owner: this.customer.getTeam(),
        master: this.customer.getTeamApprovedMember(),
        count: this.count,
        x: this.customer.getX() + Constants.tileSize,
        y: this.customer.getY()
      })
      product = mobs[0]
    } else {
      let item

      if (Item.isStackableType(this.type)) {
        item = new Item(this.customer, this.klass.name, { count: this.count })
        this.customer.inventory.store(item)
      } else {
        if (this.customer.inventory.getEmptySpaceCount() < this.count) {
          this.customer.showError("Inventory Full", { isWarning: true })
          return
        }

        for (var i = 0; i < this.count; i++) {
          item = new Item(this.customer, this.klass.name, { count: 1 })
          this.customer.inventory.store(item)
        }
      }

      product = item
    }

    let cost = 0

    // custom resource - reduce inventory by required resource amount
    let sellable = this.sector.sellables[this.klass.prototype.getTypeName()]
    if (sellable && sellable.itemName) {
      let purchaseCost = sellable.cost * this.count
      const requirements = {}
      requirements[sellable.itemName] = purchaseCost
      let operations = Item.getRequiredOperations(requirements, this.customer.inventory.storage)

      operations.forEach((operation) => {
        operation.item.reduceCount(operation.count)
      })
    } else {
      cost = this.getTotalPurchaseCost()
      this.customer.reduceGold(cost)
    }


    if (this.seller) {
      this.seller.increaseGold(cost)
      this.seller.addPurchaseHistory(this.customer, this.type)

      itemSold.reduceCount(this.count)

      if (this.seller.isBuildingStorage()) {
        this.getSocketUtil().emit(this.customer.getSocket(), "RenderStorage", { id: this.seller.id, inventory: this.seller })
      }
    }

    let typeName = this.getPurchaseTypeName()
    this.game.triggerEvent("ItemBuy", {
      playerId: this.customer.id,
      player: this.customer.name,
      itemType: typeName,
      count: this.count
    })

    this.getSocketUtil().emit(this.customer.getSocket(), "CraftSuccess", { name: product.getTypeName(), count: this.count })
  }

  getPurchaseTypeName() {
    if (this.klass.prototype.isMob()) {
      return Helper.getMobNameById(this.type)
    } else {
      return Helper.getTypeNameById(this.type)
    }
  }

  static getGroup(group) {
    return this.getGroupMap()[group]
  }

  static getGroupMap() {
    return {
      Buildings: Buildings,
      Equipments: Equipments,
      Ores: Ores,
      Bars: Bars,
      Foods: Foods,
      Drinks: Drinks,
      Ammos: Ammos,
      Mobs: Mobs
    }
  }
}

module.exports = TradeOrder
