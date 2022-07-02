const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Mobs = require("./../entities/mobs/index")
const Ores = require("./../entities/ores/index")
const Item = require("./../entities/item")
const Buildings = require("./../entities/buildings/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")
const Protocol = require("./../../../common/util/protocol")

/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class TradeMenu extends BaseMenu {
  onMenuConstructed() {
    this.errorMessage = this.el.querySelector(".error_message")

    this.activeTabContent = this.el.querySelector(".buy_trade_content")
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".buy_count").addEventListener("change", this.onBuyCountChange.bind(this), true)
    this.el.querySelector(".buy_count").addEventListener("input", this.onBuyCountInput.bind(this), true)
    this.el.querySelector(".buy_count").addEventListener("keydown", this.onBuyCountKeydown.bind(this), true)
    this.el.querySelector(".buy_count").addEventListener("keyup", this.onBuyCountKeyup.bind(this), true)

    this.el.querySelector(".trade_btn").addEventListener("click", this.onTradeBtnClick.bind(this), true)
    this.el.querySelector(".trade_inventory").addEventListener("click", this.onTradeInventoryClick.bind(this), true)
    this.el.querySelector(".trade_type_tab_container").addEventListener("click", this.onTradeTypeTabClick.bind(this), true)
  }

  onTradeTypeTabClick(e) {
    let tradeType = e.target.dataset.tradeType
    if (!tradeType) return

    let selectedTab = this.el.querySelector(".trade_type_tab.selected")
    if (selectedTab) {
      selectedTab.classList.remove("selected")
    }

    e.target.classList.add("selected")

    if (this.activeTabContent) {
      this.activeTabContent.style.display = 'none'
    }

    let tradeContent = this.el.querySelector(".trade_inventory .tab-pane[data-trade-type='" + tradeType + "'")
    this.activeTabContent = tradeContent
    this.activeTabContent.style.display = 'block'

    this.el.querySelector(".trade_btn").dataset.tradeType = tradeType
    this.el.querySelector(".trade_btn").innerText = i18n.t(Helper.capitalize(tradeType))

    this.isSelling = tradeType === 'sell'
  }

  initPurchasables() {
    if (!this.game.sector.isCustomSell) return

    let purchasables = this.game.sector.purchasables

    let rows = ""
    for (let typeName in purchasables) {
      let purchasable = purchasables[typeName]
      let klass
      let cost = purchasable.cost

      if (purchasable.group === "mob") {
        klass = Mobs.forType(purchasable.type)
      } else {
        klass = Item.getKlass(purchasable.type) 
      }
      
      let itemCount = this.getPlayerItemCount(purchasable.type)
      rows += this.createTradeItem(klass, { count: itemCount, cost: cost })
    }

    this.el.querySelector(".sell_trade_content").innerHTML = rows
  }

  getPlayerItemCount(type) {
    let count = 0

    for (let index in this.game.player.inventory) {
      let item = this.game.player.inventory[index]
      if (item && item.type === type) {
        count += item.count
      }
    }

    return count
  }

  initSellables() {
    let sellables = this.game.sector.sellables

    let rows = ""
    for (let typeName in sellables) {
      let sellable = sellables[typeName]
      let klass
      let cost = sellable.cost
      let itemName = sellable.itemName

      if (sellable.group === "mob") {
        klass = Mobs.forType(sellable.type)
      } else {
        klass = Item.getKlass(sellable.type) 
      }
      
      rows += this.createTradeItem(klass, { cost: cost, itemName: itemName })
    }

    this.el.querySelector(".buy_trade_content").innerHTML = rows
  }

  onBuyCountKeydown(e) {
    this.oldBuyCount = parseInt(e.target.value)
  }

  onBuyCountInput(e) {
    let maxLength = 4
    if (e.target.value.length > maxLength) {
      e.target.value = e.target.value.slice(0, maxLength)
    }
  }

  onBuyCountChange(e) {
    if (e.target.value.length === 0) {
      e.target.value = 1
    }
  }

  onBuyCountKeyup(e) {
    if (e.target.value.length === 0) return

    let number = parseInt(e.target.value)
    if (isNaN(number) || number < 1 || number > 9999) {
      e.target.value = this.oldBuyCount
    } 

    if (this.isSelling && this.selectedRow) {
      let itemCount = parseInt(this.selectedRow.dataset.count)
      if (number > itemCount) {
        e.target.value = itemCount
      }
    }

    if (e.key === "Enter") {
      this.onEnterUp()
    }

    if (e.keyCode === 27) {
      this.game.inputController.handleEsc()
    }
  }

  onTradeInventoryClick(event) {
    if (this.selectedRow) {
      this.unselectRow(this.selectedRow)
    }

    let row = event.target.closest(".trade_item_row")

    if (row) {
      this.selectRow(row)
      this.resetBuyCount()
    }
  }

  resetBuyCount() {
    this.el.querySelector(".buy_count").value = 1
  }

  unselectRow(row) {
    this.selectedRow = null

    if (row) {
      row.dataset.selected = false
    }
  }

  selectRow(row) {
    if (!row) return

    this.selectedRow = row
    this.selectedRow.dataset.selected = true
  }

  displayError(message) {
    this.errorMessage.innerText = message

    setTimeout(() => {
      this.errorMessage.innerText = ""
    }, 3000)
  }

  onTradeBtnClick(e) {
    if (e.target.dataset.tradeType === 'buy') {
      this.onBuyBtnClick()
    } else {
      this.onSellBtnClick()
    }
  }

  onSellBtnClick() {
    if (!this.selectedRow) return
    if (this.el.querySelector(".trade_btn").dataset.disabled === "true") return

    let buyCount = parseInt(this.el.querySelector(".buy_count").value)
    if (isNaN(buyCount)) buyCount = 1

    let group = this.selectedRow.dataset.group
    let type = this.selectedRow.dataset.type
    let index = this.selectedRow.dataset.index

    SocketUtil.emit("Trade", { group: group, type: type, count: buyCount, sell: true, index: index })
  }

  onBuyBtnClick() {
    if (!this.game.player) return
    if (!this.selectedRow) return
    if (this.el.querySelector(".trade_btn").dataset.disabled === "true") return

    let buyCount = parseInt(this.el.querySelector(".buy_count").value)
    if (isNaN(buyCount)) buyCount = 1

    let cost = parseInt(this.selectedRow.querySelector(".trade_item_cost").innerText)
    let totalCost = cost * buyCount

    if (player.isInventoryFull()) {
      this.displayError("Inventory Full")
      return
    }

    let group = this.selectedRow.dataset.group
    let type = this.selectedRow.dataset.type
    let index = this.selectedRow.dataset.index

    SocketUtil.emit("Trade", { group: group, type: type, count: buyCount, index: index })
  }

  onMenuInteract(cmd) {
    switch(cmd) {
      case "GoUp":
        this.onGoUp()
        break
      case "GoDown":
        this.onGoDown()
        break
      case "EnterUp":
        this.onEnterUp()
        break
    } 
  }

  onEnterUp() {
    if (this.isSelling) {
      this.onSellBtnClick()
    } else {
      this.onBuyBtnClick()
    }
  }

  updateGoldCount(gold) {
    this.el.querySelector(".player_gold_count_value").innerText = gold || 0
  }

  onCraftSuccess(data) {
    let rect = this.el.querySelector(".trade_btn").getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left - 50

    this.game.animateCraftSuccess(data)
  }

  onCraftCountKeyup(e) {
    if (e.target.value.length === 0) return

    let number = parseInt(e.target.value)
    if (isNaN(number) || number < 1 || number > 99) {
      e.target.value = this.oldBuyCount
    } 

    if (e.key === "Enter") {
      this.onCraftBtnHold()
    }

    if (e.keyCode === 27) {
      this.game.inputController.handleEsc()
    }
  }


  onGoUp() {
    this.onGoDirection(-1)
  }

  onGoDown() {
    this.onGoDirection(1)
  }

  onGoDirection(direction) {
    let rows = Array.from(this.el.querySelectorAll(".trade_item_row"))
    let rowIndex = Array.prototype.indexOf.call(rows, this.selectedRow)
    this.unselectRow(this.selectedRow)

    if (direction > 0) {
      // going down
      let isLastRow = rowIndex === rows.length - 1
      if (isLastRow) {
        this.selectRow(rows[0])
      } else {
        this.selectRow(rows[rowIndex + 1])
      }
    } else {
      let isFirstRow = rowIndex === 0
      if (isFirstRow) {
        this.selectRow(rows[rows.length - 1])
      } else {
        this.selectRow(rows[rowIndex - 1])
      }
    }
  }



  open(seller) {
    super.open()

    this.initSellables()
    let rows = Array.from(this.el.querySelectorAll(".trade_item_row"))
    this.selectRow(rows[0]) // select first item

    this.seller = seller
    this.initPurchasables()
    this.renderPlayerSellables()
    this.renderAdditionalTraderSellables()
  }

  renderAdditionalTraderSellables() {
    let grenadeType = Protocol.definition().BuildingType.Grenade
    let poisonGrenadeType = Protocol.definition().BuildingType.PoisonGrenade

    let grenadeTradeItemRow = this.el.querySelector(".buy_trade_content .trade_item_row[data-type='" + grenadeType + "']")  
    let poisonGrenadeTradeItemRow = this.el.querySelector(".buy_trade_content .trade_item_row[data-type='" + poisonGrenadeType + "']")  

    if (this.game.isPvP()) {
      if (!grenadeTradeItemRow) {
        this.el.querySelector(".buy_trade_content").innerHTML += this.createTradeItem(Equipments.PoisonGrenade)
        this.el.querySelector(".buy_trade_content").innerHTML += this.createTradeItem(Equipments.Grenade)
      }
    } else {
    }
  }

  onInventoryChanged() {
    this.renderPlayerSellables()
    this.initPurchasables()
  }

  renderPlayerSellables() {
    if (!this.game.player) return
    if (this.game.sector.isCustomSell) return

    let isSelling = true
    let rows = ""
    for (let index in this.game.player.inventory) {
      let item = this.game.player.inventory[index]
      if (item) {
        let itemKlass = Item.getKlass(item.type)
        if (!this.shouldExcludeFromSelling(itemKlass)) {
          rows += this.createTradeItem(itemKlass, { count: item.count, index: index, isSelling: isSelling })
        }
      }
    }

    this.el.querySelector(".sell_trade_content").innerHTML = rows

    if (this.selectedRow) {
      let prevIndex = this.selectedRow.dataset.index
      if (isNaN(prevIndex)) return
        
      const newSelectedRow = this.el.querySelector(".trade_item_row[data-index='" + prevIndex + "']")
      if (newSelectedRow) {
        this.selectRow(newSelectedRow)
      } else {
        this.selectedRow = null
      }
    }
  }

  shouldExcludeFromSelling(itemKlass) {
    return itemKlass.getTypeName() === "Gold" || itemKlass.isTerrain()
  }

  cleanup() {
    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach((inventorySlot) => {
      this.game.resetInventorySlot(inventorySlot)
    })
  }

}



module.exports = TradeMenu
