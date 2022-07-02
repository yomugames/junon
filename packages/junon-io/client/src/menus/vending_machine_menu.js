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

    SocketUtil.emit("Trade", { group: group, type: type, count: 1, recipientId: this.entity.getId(), index: index })
  }

  onPurchasableItemsClick(event) {
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


  onCraftSuccess(data) {
    let rect = this.el.querySelector(".buy_btn").getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left - 50

    this.game.animateCraftSuccess(data)
  }

  renderPurchasables() {
    let rows = ""
    for (let index in this.storage) {
      let item = this.storage[index]
      let itemKlass = Item.getKlass(item.type)
      rows += this.createTradeItem(itemKlass, { count: item.count, index: index })
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
