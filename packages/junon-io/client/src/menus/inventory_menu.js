const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")


/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class InventoryMenu extends BaseMenu {
  onMenuConstructed() {
    this.initSlots()
    this.initQuickInventory()

    this.hungerBar       = document.querySelector('.hunger_stat')
    this.thirstBar       = document.querySelector('.thirst_stat')
  }

  initSlots() {
    let regularInventoryBaseIndex = Constants.regularInventoryBaseIndex
    let inventorySlots = Constants.Player.inventoryCount - regularInventoryBaseIndex
    let inventoryEl = ""
    for (var i = 0; i < inventorySlots; i++) {
      let el = "<div class='player_inventory_slot inventory_slot' data-index='" + (regularInventoryBaseIndex + i) + "'><img src=''></div>"
      inventoryEl += el
    }

    this.el.querySelector("#player_inventory").innerHTML = inventoryEl
  }

  initQuickInventory() {
    let quickInventorySlots = 8
    let inventoryEl = ""
    for (var i = 0; i < quickInventorySlots; i++) {
      let index = i
      let el = "<div class='player_inventory_slot inventory_slot' data-index='" + index + "'><div class='cooldown_overlay'></div><img src=''></div>"
      inventoryEl += el
    }

    document.querySelector("#player_quick_inventory").innerHTML = inventoryEl
    document.querySelector("#player_quick_inventory").addEventListener("dblclick", this.onQuickInventoryDblClick.bind(this), true)
  }

  onQuickInventoryDblClick(e) {
    let slot = e.target.closest(".player_inventory_slot")
    if (slot) {
      let type = parseInt(slot.dataset.type)
      let isFloor = type === Protocol.definition().BuildingType.Floor 
      let isWall = type === Protocol.definition().BuildingType.Wall || type === Protocol.definition().BuildingType.Wall3d
      if (isFloor || isWall) {
        this.game.colorPickerMenu.open({ colors: this.game.colors, entityId: null })
      }
    }
  }

  onPlayerEquipmentDblClick(e) {
    if (this.game.isMiniGame()) return
    let slot = e.target.closest(".equipment_slot")
    if (slot) {
      let type = parseInt(slot.dataset.type)
      let id = parseInt(slot.dataset.id)
      let isSpaceSuit = type === Protocol.definition().BuildingType.SpaceSuit 
      if (isSpaceSuit) {
        this.game.suitColorMenu.open({colors: this.game.suitColors, entityId: id })
      }
    }
  }

  open(label, storageId) {
    super.open()

    if (this.game.player) {
      this.updateGoldCount(this.game.player.gold)
    }
  }

  updateGoldCount(gold) {
    this.el.querySelector(".player_gold_count_value").innerText = gold || 0
  }

  cleanup() {
    let selectors = "#inventory_menu .inventory_slot, #player_quick_inventory_menu .inventory_slot"
    Array.from(document.querySelectorAll(selectors)).filter((inventorySlot) => {
      let isNotInventoryButton = inventorySlot.dataset.index !== "-1"
      return isNotInventoryButton
    }).forEach((inventorySlot) => {
      this.game.resetInventorySlot(inventorySlot)
    })
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector("#player_equipment").addEventListener("dblclick", this.onPlayerEquipmentDblClick.bind(this), true)

    Array.from(this.el.querySelectorAll(".inventory_slot")).forEach((el) => {
      this.initInventorySlotListener(el)
    })

    Array.from(document.querySelectorAll("#player_quick_inventory_menu .inventory_slot")).forEach((el) => {
      this.initInventorySlotListener(el)
    })
  }

  render(data) {
    let inventory = data.inventory
    
    if (inventory.clientMustDelete) {
      this.removeInventory(inventory)
    } else {
      this.renderInventory(inventory)
    }
  }

  renderInventory(data) {
    // we use document since we are updating both inventory + quickInventory

    const prevInventorySlot = document.querySelector(".player_inventory_slot[data-id='" + data.id  + "']")
    if (prevInventorySlot) {
      this.getPlayer().inventory[prevInventorySlot.dataset.index] = null
      this.game.resetInventorySlot(prevInventorySlot)
    }

    const index = data.index
    const inventorySlot = document.querySelector(".player_inventory_slot[data-index='" + index  + "']")
    this.game.renderInventorySlot(inventorySlot, data)

    if (this.getPlayer()) {
      this.getPlayer().inventory[data.index] = data
    }
  }

  removeInventory(data) {
    const index = data.index
    const inventorySlot = document.querySelector(".player_inventory_slot[data-index='" + index  + "']")

    this.game.resetMobilePrimaryActionBtn(inventorySlot)
    this.game.resetInventorySlot(inventorySlot)

    if (this.getPlayer()) {
      delete this.getPlayer().inventory[data.index]
    }
  }

}



module.exports = InventoryMenu
