const SocketUtil = require("./../util/socket_util")
const StorageMenu = require("./storage_menu")
const Constants = require("./../../../common/constants.json")
const Item = require("./../entities/item")

class VendingMachineMenu extends StorageMenu {

  onMenuConstructed() {
    super.onMenuConstructed()

    this.errorMessage = this.el.querySelector(".error_message")
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".vending_machine_tab_container").addEventListener("click", this.onVendingMachineTabClick.bind(this), true)
    this.el.querySelector(".purchasable_items_list").addEventListener("click", this.onPurchasableItemsClick.bind(this), true)
    this.el.querySelector(".buy_btn").addEventListener("click", this.onBuyBtnClick.bind(this), true)
    this.el.querySelector(".collect_money_btn").addEventListener("click", this.onWithdrawBtnClick.bind(this), true)
  }

  onStorageInventoryUpdated() {
    this.renderPurchasables()
  }

  updateStorageGoldAmount() {
    this.el.querySelector(".collected_money_value").innerText = this.entity.getGold() 
  }

  open(label, entity) {
    super.open(label, entity)

    this.updateStorageGoldAmount()
    this.renderManageTab()
    this.renderWithdrawBtn()

    // reset row selection
    if (this.selectedRow) {
      this.unselectRow(this.selectedRow)
    }

    this.selectTab(this.el.querySelector(".vending_machine_tab[data-tab='purchase']"))
  }

  renderManageTab() {
    if (this.game.player.isGuest()) {
      this.el.querySelector(".vending_machine_tab[data-tab='manage']").style.display = 'none'
    } else {
      this.el.querySelector(".vending_machine_tab[data-tab='manage']").style.display = 'inline-block'
    }
  }

  renderWithdrawBtn() {
    let team = this.game.player.getTeam()
    if (this.game.isLeaderAndOwner(this.entity, team, this.game.player)) {
      this.el.querySelector(".collect_money_btn").style.display = 'block'
    } else {
      this.el.querySelector(".collect_money_btn").style.display = 'none'
    }
  }

  onWithdrawBtnClick(e) {
    SocketUtil.emit("EditBuilding", { id: this.entity.getId(), action: 'withdraw' })
  }

  displayError(message) {
    this.errorMessage.innerText = message

    setTimeout(() => {
      this.errorMessage.innerText = ""
    }, 3000)
  }

  onBuyBtnClick() {
    if (!this.selectedRow) return
    if (this.el.querySelector(".buy_btn").dataset.disabled === "true") return

    let group = this.selectedRow.dataset.group
    let type = this.selectedRow.dataset.type
    let index = parseInt(this.selectedRow.dataset.index)
    let itemId = this.storage[index].id

    SocketUtil.emit("Trade", { group: group, type: type, count: 1, recipientId: this.entity.getId(), index: index, id: itemId })
  }

  onPurchasableItemsClick(event) {
    let reprice = event.target.closest(".reprice_btn")
    let row = event.target.closest(".trade_item_row")

    if (this.selectedRow && row !== this.selectedRow) {
      this.unselectRow(this.selectedRow)
    }
    
    if(reprice) {
      this.selectRow(row)
      this.onRepriceBtnClick()
    } else if (row) {
      this.selectRow(row)
    }
  }

  unselectRow(row) {
    let input = row.querySelector(".trade_item_reprice")

    if(input.style.display !== 'none') {
      input.style.display = 'none'
      let itemCost = row.querySelector(".trade_item_cost")
      this.resetCost(row)
    }

    this.selectedRow = null

    if (row) {
      row.dataset.selected = false
    }
  }

  selectRow(row) {
    this.selectedRow = row
    this.selectedRow.dataset.selected = true
  }


  onCraftSuccess(data) {
    let rect = this.el.querySelector(".buy_btn").getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left - 50

    this.game.animateCraftSuccess(data)
  }

  createTradeItem(klass, options = {}) {
    let imagePath = "/assets/images/" + klass.prototype.getSpritePath()

    let cost = (options.isSelling ? Math.ceil(klass.getCost() / 2) : klass.getCost())
    if (options.cost) cost = options.cost
    let currency = "G"
    let currencyklass = ""
    if (options.itemName) {
      currency = options.itemName
      currencyklass = "custom"
    }

    let team = this.game.player.getTeam()
    let repriceButton = this.game.player.isAdmin() ? "<button class='reprice_btn'><img src='/assets/images/edit_icon.png' style='width: 16px;'></button>" : ""

    const el = "<div class='trade_item_row' data-group='" + klass.getSellGroup() + "' data-type='" + klass.getType() + "' data-count='" + options.count + "' data-index='" + options.index + "' >" +
                    repriceButton +
                    "<img class='trade_item_image' src='" + imagePath + "'>" +
                    "<div class='trade_item_name'>" + i18n.t(klass.getTypeName()) + "</div>" +
                    "<div class='trade_item_count'>" + (options.count ? 'x' + options.count : '') + "</div>" +
                    "<div class='trade_item_cost" + currencyklass + "'>" + cost  + " " + currency + "</div>" +
                    "<input class='trade_item_cost trade_item_reprice'>" +
                "</div>"

    return el
  }

  renderPurchasables() {
    let rows = ""
    for (let index in this.storage) {
      let item = this.storage[index]
      let itemKlass = Item.getKlass(item.type)

      let itemId = item.id
      if (this.entity.prices && Object.hasOwn(this.entity.prices, itemId)) {
        rows += this.createTradeItem(itemKlass, { count: item.count, index: index, cost: this.entity.prices[itemId]})
      } else {
        rows += this.createTradeItem(itemKlass, { count: item.count, index: index })
      }
    }

    this.el.querySelector(".purchasable_items_list").innerHTML = rows

    if (rows.length === 0) {
      this.el.querySelector(".purchase_empty_state").style.display = 'block'
    } else {
      this.el.querySelector(".purchase_empty_state").style.display = 'none'
    }


    if (this.selectedRow) {
      let type = this.selectedRow.dataset.type
      let index = this.selectedRow.dataset.index
      let tradeItemRow = this.el.querySelector(`.trade_item_row[data-type='${type}'][data-index='${index}'`)
      if (tradeItemRow) {
        this.selectRow(tradeItemRow)
      }
    }

  }

  onRepriceBtnClick() {
    // verify perms before doing this...
    if (!this.game.player.isAdmin()) return

    if (this.selectedRow) {
      let type = this.selectedRow.dataset.type
      let index = this.selectedRow.dataset.index
      let tradeItemRow = this.el.querySelector(`.trade_item_row[data-type='${type}'][data-index='${index}'`)
      if (!tradeItemRow) {
        return
      }
    } else {
      return
    }

    let input = this.selectedRow.querySelector(".trade_item_reprice")
    let itemCost = this.selectedRow.querySelector(".trade_item_cost")
    let index = parseInt(this.selectedRow.dataset.index)

    if(input.style.display !== 'block') {
      input.style.display = 'block'
      // grab number price
      input.value = itemCost.innerText.split(" ", 1)
      itemCost.innerText = " G"

      input.focus()
    } else {
      input.style.display = 'none'
      // make it a number
      let cost = input.value.replace(/\D/g, "")
      if(cost.length !== 0 && Number(cost) > 0 && Number(cost) <= 100000) {
        itemCost.innerText = cost + " G"
        SocketUtil.emit("VendingPriceChange", { vendId: this.entity.id, cost: cost, itemId: this.storage[index].id })
      } else {
        this.game.displayError("Invalid Amount", { warning: true })
        this.resetCost(this.selectedRow)
      }
    }

    // this.selectedRow.querySelector(".trade_item_reprice").select()
  }

  resetCost(row) {
    if (!row) return
    let itemCost = this.row.querySelector(".trade_item_cost")
    let index = parseInt(this.row.dataset.index)

    itemCost.innerText = Item.getKlass(this.row.dataset.type).getCost() + " G"

    if (this.entity.prices && this.entity.prices[this.storage[index].id]) {
      itemCost.innerText = this.entity.prices[this.storage[index].id] + " G"
    }
  }

  updateGoldCount(gold) {
    this.el.querySelector(".player_gold_count_value").innerText = gold || 0
  }

  onVendingMachineTabClick(e) {
    let tab = e.target.closest('.vending_machine_tab')
    if (!tab) return

    this.selectTab(tab)
  }

  selectTab(tab) {
    let selectedTab = this.el.querySelector('.vending_machine_tab.selected')
    if (selectedTab) {
      selectedTab.classList.remove("selected")
    }

    tab.classList.add("selected")

    let filter = tab.dataset.tab

    let content = this.el.querySelector(".vending_machine_tab_content[data-tab='" + filter + "']")
    if (content) {
      let activeContent = this.el.querySelector(".vending_machine_tab_content.active")
      if (activeContent) {
        activeContent.classList.remove("active")
      }

      content.classList.add("active")
    }

  }

}

module.exports = VendingMachineMenu
