const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Mobs = require("./../entities/mobs/index")
const Ores = require("./../entities/ores/index")
const Item = require("./../entities/item")
const Buildings = require("./../entities/buildings/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")

/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class SlaveTradeMenu extends BaseMenu {
  onMenuConstructed() {
    this.initSellables()
    let rows = Array.from(this.el.querySelectorAll(".trade_item_row"))
    this.selectRow(rows[0]) // select first item

    this.errorMessage = this.el.querySelector(".error_message")

    this.activeTabContent = this.el.querySelector(".buy_trade_content")
  }

  initListeners() {
    super.initListeners()

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

  initSellables() {
    let items = [Mobs.NuuSlave, Mobs.PixiSlave, Mobs.GaramSlave]

    let rows = items.map((klass) => {
      return this.createTradeItem(klass)
    }).join("")

    this.el.querySelector(".buy_trade_content").innerHTML = rows
  }

  onTradeInventoryClick(event) {
    if (this.selectedRow) {
      this.unselectRow(this.selectedRow)
    }

    let row = event.target.closest(".trade_item_row")

    if (row) {
      this.selectRow(row)
    }
  }

  unselectRow(row) {
    this.selectedRow = null

    if (row) {
      row.dataset.selected = false
    }
  }

  selectRow(row) {
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

    let buyCount = 1

    let group = this.selectedRow.dataset.group
    let type = this.selectedRow.dataset.type
    let index = this.selectedRow.dataset.index
    let id = this.selectedRow.dataset.id

    SocketUtil.emit("Trade", { group: group, type: type, count: buyCount, sell: true, index: index, id: id })
  }

  onBuyBtnClick() {
    if (!this.selectedRow) return
    if (this.el.querySelector(".trade_btn").dataset.disabled === "true") return

    let buyCount = 1

    let cost = parseInt(this.selectedRow.querySelector(".trade_item_cost").innerText)
    let totalCost = cost * buyCount

    if (player.gold < totalCost) {
      this.displayError("Not enough gold")
      return
    }

    let group = this.selectedRow.dataset.group
    let type = this.selectedRow.dataset.type
    let index = this.selectedRow.dataset.index

    SocketUtil.emit("Trade", { group: group, type: type, count: buyCount, index: index, recipientId: this.seller.id })
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

    this.seller = seller
    this.renderPlayerSellables()
  }

  onResidentsChanged() {
    this.renderPlayerSellables()
  }

  createMobTradeItem(mobData, isSelling) {
    let klass = Mobs.forType(mobData.type)
    let imagePath = "/assets/images/" + klass.prototype.getSpritePath()

    const el = "<div class='trade_item_row' data-id='" + mobData.id + "' data-group='" + klass.getSellGroup() + "' data-type='" + klass.getType() + "' data-count='1' >" +
                    "<img class='trade_item_image' src='" + imagePath + "'>" +
                    "<div class='trade_item_name'>" + mobData.name + "</div>" +
                    "<div class='trade_item_count'></div>" +
                    "<div class='trade_item_cost'>" + Math.ceil(klass.getCost() / 2)  + " G</div>" +
                "</div>"

    return el
  }

  renderPlayerSellables() {
    if (!this.game.player) return


    let isSelling = true
    let rows = ""
    for (let id in this.game.residents) {
      let mobData = this.game.residents[id]
      rows += this.createMobTradeItem(mobData, isSelling)
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
    return itemKlass.getTypeName() === "Gold"
  }

  cleanup() {
    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach((inventorySlot) => {
      this.game.resetInventorySlot(inventorySlot)
    })
  }

}



module.exports = SlaveTradeMenu
