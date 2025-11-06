const Item = require("./../entities/item")
const SocketUtil = require("./../util/socket_util")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")

class BaseMenu {
  constructor(game, el) {
    this.el   = el
    this.game = game

    this.buildingTooltip  = document.querySelector("#building_menu_tooltip")

    this.onMenuConstructed() // before listeners are setup so listeners can attach to dynamic dom elements
    this.initListeners()

    this.game.registerMenu(this)
  }

  getPlayer() {
    return this.game.player
  }

  isModal() {
    return true
  }

  finishOpen() {
    // nothing by default
  }

  onMenuConstructed() {
    // callback
  }

  initListeners() {
    const cancelBtn = this.el.querySelector(".cancel_btn")
    if (cancelBtn) {
      cancelBtn.addEventListener("click", this.onCancelBtnClick.bind(this), true)
    }
  }

  onCancelBtnClick() {
    this.close()
  }

  initInventorySlotListener(el) {
    if (this.game.main.isMobile) {
      el.addEventListener("touchstart", this.onInventoryTouchStart.bind(this), true)
      el.addEventListener("touchmove", this.onInventoryTouchMove.bind(this), true)
      el.addEventListener("touchend", this.onInventoryTouchEnd.bind(this), true)
    } else {
      el.addEventListener("mouseover", this.onInventoryMouseover.bind(this), true)
      el.addEventListener("mouseout", this.onInventoryMouseout.bind(this), true)
      el.addEventListener("mousedown", this.onInventoryMouseDown.bind(this), true)
      el.addEventListener("mouseup", this.onInventoryMouseUp.bind(this), true)
    }
  }

  onInventoryMouseUp(e) {
  }

  onInventoryMouseDown(e) {
    const storageId = e.target.closest(".storage").dataset.storageId
    const index = e.target.closest(".inventory_slot").dataset.index

    if (this.game.inputController.isRightClick(e)) {
      if (this.game.holdItemInventorySlot) {
        SocketUtil.emit("ManageStack", { 
          storageId: storageId,
          index: index, 
          mode: Protocol.definition().StackOperationType.Merge,
          count: 1
        })
      } else {
        SocketUtil.emit("ManageStack", { 
          storageId: storageId,
          index: index, 
          mode: Protocol.definition().StackOperationType.Split
        })
      }
    } else {
      if (this.game.holdItemInventorySlot) {
        let count = this.game.holdItemInventorySlot.dataset.content
        count = parseInt(count)
        if (isNaN(count)) {
          count = 1
        }

        SocketUtil.emit("ManageStack", { 
          storageId: storageId,
          index: index, 
          mode: Protocol.definition().StackOperationType.Merge,
          count: count
        })
      }
    }
  }

  onInventoryMouseover(e) {
    const inventorySlot = e.target.closest(".inventory_slot")
    if (inventorySlot) {
      let boundingRect = inventorySlot.getBoundingClientRect()
      this.showInventoryTooltip(inventorySlot, boundingRect)
    }
  }

  showInventoryTooltip(inventorySlot, boundingRect) {
    const type = parseInt(inventorySlot.dataset.type)
    if (isNaN(type)) return
      
    const itemId = inventorySlot.dataset.id
    const itemContent = inventorySlot.dataset.special
    const itemKlass = Item.getKlass(type)
    if (itemKlass) {
      this.showBuildMenuForAt(itemId, itemKlass, inventorySlot, itemContent, boundingRect)
    }
  }

  onInventoryTouchStart(e) {
    const inventorySlot = e.target.closest(".inventory_slot")
    let boundingRect = inventorySlot.getBoundingClientRect()

    this.displayBuildMenuTimeout = setTimeout(() => {
      this.showInventoryTooltip(inventorySlot, boundingRect)
    }, 500)
  }

  renderPlayerInventory(data) {
    let inventory = data.inventory
    
    if (inventory.clientMustDelete) {
      const inventorySlot = this.el.querySelector(".storage_player_inventory .inventory_slot[data-index='" + inventory.index  + "']")
      this.game.resetInventorySlot(inventorySlot)
    } else {
      const prevInventorySlot = this.el.querySelector(".storage_player_inventory .inventory_slot[data-id='" + inventory.id  + "']") 
      if (prevInventorySlot) {
        this.game.resetInventorySlot(prevInventorySlot)
      }

      const inventorySlot = this.el.querySelector(".storage_player_inventory .inventory_slot[data-index='" + inventory.index  + "']")
      this.game.renderInventorySlot(inventorySlot, inventory)
    }
  }

  initPlayerInventorySlotListeners() {
    let elements = this.el.querySelectorAll(".storage_player_inventory .inventory_slot")
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      this.initInventorySlotListener(el)
    }
  }

  initPlayerInventoryStorage() {
    const inventorySlotCount = Constants.Player.inventoryCount 

    this.el.querySelector(".storage_player_inventory").innerHTML = this.createInventorySlots(inventorySlotCount)
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

    const el = "<div class='trade_item_row' data-group='" + klass.getSellGroup() + "' data-type='" + klass.getType() + "' data-count='" + options.count + "' data-index='" + options.index + "' >" +
                    "<img class='trade_item_image' src='" + imagePath + "'>" +
                    "<div class='trade_item_name'>" + i18n.t(klass.getTypeName()) + "</div>" +
                    "<div class='trade_item_count'>" + (options.count ? 'x' + options.count : '') + "</div>" +
                    "<div class='trade_item_cost " + currencyklass + "'>" + cost  + " " + currency + "</div>" +
                "</div>"

    return el
  }
  
  hideQuickInventory() {
    document.querySelector("#player_quick_inventory_menu").style.display = 'none'
  }

  showQuickInventory() {
    document.querySelector("#player_quick_inventory_menu").style.display = 'block'
  }

  shouldHideQuickInventory() {
    return false
  }

  onInventoryTouchEnd(e) {
    clearTimeout(this.displayBuildMenuTimeout)
    this.onInventoryMouseout(e)
  }

  onInventoryTouchMove(e) {
    clearTimeout(this.displayBuildMenuTimeout)
  }

  onInventoryMouseout(e) {
    this.buildingTooltip.style.display = 'none'
  }

  showBuildMenuForAt(itemId, buildingKlass, inventorySlot, itemContent, boundingRect) {
    this.buildingTooltip.style.display = 'block'
    if (this.game.shouldShowDebugDetails()) {
      if (!this.buildingTooltip.classList.contains("admin")) {
        this.buildingTooltip.classList.add("admin")
      }
    } else {
      this.buildingTooltip.classList.remove("admin")
    }
    this.buildingTooltip.querySelector(".entity_name_label").innerText = i18n.t(buildingKlass.getCraftTypeName(itemContent))
    this.buildingTooltip.querySelector(".entity_id").innerText = "ID: " + itemId
    this.buildingTooltip.querySelector(".entity_description").innerText = buildingKlass.getDescription(itemContent)

    // if (!this.isTouchDevice()) {
    this.repositionTooltip(inventorySlot, boundingRect)
    // }
  }

  isTouchDevice() {
    return ('ontouchstart' in document.documentElement)
  }

  repositionTooltip(inventorySlot, boundingRect) {
    const bottomMargin = 25
    let left = boundingRect.x - this.buildingTooltip.offsetWidth  / 2 + inventorySlot.offsetWidth / 2
    let top  = boundingRect.y - this.buildingTooltip.offsetHeight  - bottomMargin
    const margin = 25

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - this.buildingTooltip.offsetWidth - margin, left) // cant be more than than margin

    if (top < margin) {
      // show at bottom instead
      top = boundingRect.y + (bottomMargin * 2)
    }
    top = Math.max(margin, top) // cant be lower than margin
    top = Math.min(window.innerHeight - this.buildingTooltip.offsetHeight - margin, top) // cant be more than than margin

    this.buildingTooltip.style.left = left + "px"
    this.buildingTooltip.style.top  = top  + "px"
  }

  closeAllMenus() {
    this.game.closeAllMenus()
  }

  isEntityMenu() {
    return false
  }

  open(options = {}) {
    if (this.isControllingPlayerRequired()) {
      if (!this.game.player) return
      if (!this.game.player.isControllingPlayer()) return
    }

    if (this.game.shouldDenyMenuOpen) return

    if (!options.dontCloseMenus) {
      this.closeAllMenus()
    }

    if (!this.isAlwaysOpen()) {
      let isNotOpen = this.game.openMenus.indexOf(this) === -1
      if (isNotOpen) {
        this.game.openMenus.push(this)
      }
    }

    this.setOpenDisplay()
  }

  setOpenDisplay() {
    this.el.style.display = 'block'
  }

  isControllingPlayerRequired() {
    return true
  }

  isAlwaysOpen() {
    return false
  }

  close(options = {}) {
    if (!options.manualUnregister) {
      let index = this.game.openMenus.indexOf(this)
      if (index >= 0) {
        this.game.openMenus.splice(index, 1)
      }
    }

    if (this.storageId) {
      SocketUtil.emit("CloseStorage", { id: this.storageId })
    }

    this.el.style.display = 'none'
  }

  isOpen() {
    return this.el.style.display === 'block'
  }

  isClose() {
    return this.el.style.display === 'none'
  }

  toggle() {
    if (this.isClose()) {
      this.open()
    } else {
      this.close()
    }
  }

  onCraftSuccess(data) {
    // nothing by default
  }

  onInventoryChanged() {
    // nothing by default
  }

  onCraftBtnRelease() {
    this.isCraftBtnHeld = false
  }

  onItemUnlocked() {
    this.showProductInfo(this.craftType)
    this.animateUnlockSuccess({name: Protocol.definition().BuildingType[this.craftType], x: this.el.querySelector(".craft_btn").getBoundingClientRect().x, y: this.el.querySelector(".craft_btn").getBoundingClientRect().y})
  }

  onCraftBtnHold() {
    if (this.isDisabled) return
    if (!this.craftType) return

    if (this.el.querySelector(".craft_btn").dataset.disabled === "true") return

    this.isCraftBtnHeld = true

    if(this.el.querySelector('.craft_btn').innerText.includes("Unlock")) { // RP
      SocketUtil.emit("UnlockItem", {type: this.craftType})

      return;
    }

    let craftCount = parseInt(this.el.querySelector(".craft_count").value)
    if (isNaN(craftCount)) craftCount = 1
    this.craftItem(craftCount)

    // // reset interval
    // clearInterval(this.craftMultipleInterval)

    // this.craftMultipleInterval = setInterval(() => {
    //   if (this.isCraftBtnHeld) {
    //     this.craftItem(5)
    //   } else {
    //     clearInterval(this.craftMultipleInterval)
    //   }
    // }, 600)
  }

  craftItem(count) {
    let options = { storageId: this.getStorageId(), type: this.craftType, count: count }
    
    if (this.sourceStorageId) {
      options['sourceStorageId'] = this.sourceStorageId
    }
    
    SocketUtil.emit("Craft", options)
  }

  cleanup() {

  }

  clearRequirements() {
    this.el.querySelector(".crafting_requirements").innerHTML = ""
  }

  showProductInfo(type) {
    const itemKlass = Item.getKlass(type)
    let imagePath = "/assets/images/" + itemKlass.prototype.getSpritePath()

    this.el.querySelector(".blueprint_image").src = imagePath
    this.el.querySelector(".blueprint_name").innerText = i18n.t(itemKlass.getCraftTypeName())
    this.el.querySelector(".blueprint_description").innerText = itemKlass.getDescription()

    let productUnavailableEl = this.el.querySelector(".product_unavailable_notice")
    if (!this.isBuildingAllowedInGame(type)) {
      if (productUnavailableEl) {
        productUnavailableEl = i18n.t('Disabled in PvP')
      }
      this.el.querySelector(".craft_count").style.display = 'none'
      this.el.querySelector(".craft_btn").style.display = 'none'
    } else {
      if (productUnavailableEl) {
        productUnavailableEl.style.display = 'none'
      }
      this.el.querySelector(".craft_count").style.display = 'inline-block'
      this.el.querySelector(".craft_btn").style.display = 'inline-block'
    }

    this.showRequirements(type)
  }

  isBuildingAllowedInGame(type) { if (this.game.isPvP()) {
      let notAllowedList = ["Atm", "RailStop", "RailTrack", "Beacon"]
      notAllowedList = notAllowedList.map((name) => {
        return Protocol.definition().BuildingType[name]
      })

      if (notAllowedList.indexOf(type) !== -1) {
        return false
      }
    } else if (this.game.isHardcore() || this.game.isPeaceful()) {
      let notAllowedList = ["Atm"]
      notAllowedList = notAllowedList.map((name) => {
        return Protocol.definition().BuildingType[name]
      })

      if (notAllowedList.indexOf(type) !== -1) {
        return false
      }
    }

    return true
  }

  isSandboxMode() {
    if (this.game.isSandbox()) return true
    return (debugMode && this.game.isAdminMode)
  }

  showRequirements(type) {
    let itemKlass = Item.getKlass(type)
    this.clearRequirements()

    const requirements = Item.getCraftRequirements(type, this.game.player)
    requirements.forEach((requirement) => {
      let row = this.createRequirementRow(requirement)
      this.el.querySelector(".crafting_requirements").innerHTML += row
    })

    let isSandboxModeAndOwner = this.isSandboxMode() && this.game.player.isSectorOwner()
    if (this.isDisabled || (this.hasMissingRequirements(requirements, itemKlass) /*&& !isSandboxModeAndOwner*/)) {
      this.el.querySelector(".craft_btn").dataset.disabled = true
    } else {
      this.el.querySelector(".craft_btn").dataset.disabled = ""
    }
  }

  renderRP(itemKlass) {
    let productUnavailableEl = this.el.querySelector(".product_unavailable_notice");
    let craftBtnEl = this.el.querySelector(".craft_btn");
    if(!itemKlass) return;

    if (this.game.sector.unlockedItems.indexOf(itemKlass.prototype.constructor.name) !== -1) return;

    craftBtnEl.innerText = `Unlock (${itemKlass.prototype.getRequiredRP()} RP)`;

    if(itemKlass.prototype.getRequiredRP() > this.game.sector.RPLevel) {
      productUnavailableEl.style.display = "block";
      productUnavailableEl.innerText = "Not enough RP (reputation points)";
    } else {
      productUnavailableEl.style.display = "none";
    }
  }

  hasMissingRequirements(requirements, itemKlass) {
    if(itemKlass && itemKlass.prototype.isRPItem()) {
        if(this.game.sector.gameMode != 'peaceful' && this.game.sector.unlockedItems.indexOf(Protocol.definition().BuildingType[itemKlass.prototype.getType()]) === -1) {
        this.renderRP(itemKlass);
        if (this.game.sector.RPLevel < itemKlass.prototype.getRequiredRP()) {
          return true;
        } else {
          return false;
        }
      } else {
        let craftBtnEl = this.el.querySelector(".craft_btn");
        craftBtnEl.innerText = i18n.t("Craft");
      }

    } return requirements.find((requirement) => {
      let count = requirement.count;
      let buildSpeed = this.game.sector.buildSpeed;
      count = Math.ceil(count / buildSpeed)
      
      
      return requirement.supply < count
    })
  }

  createRequirementRow(requirement) {
    let type = requirement.klass.getType()
    let imgSrc = this.game.getImageSrcForItemType(type)

    let count = requirement.count
    let buildSpeed =  this.game.sector.buildSpeed
    count = Math.ceil(count / buildSpeed)


    let hasInsufficientSupply = requirement.supply < count
    let supplyClassName = hasInsufficientSupply ? "unmet" : ""

    let requirementName = isForeignLanguage ? i18n.t(requirement.name) : requirement.name

    let el = "<div class='requirement_row'>" +
               "<img src='" + imgSrc + "'>" +
               "<div class='requirement_name'>" + requirementName + "</div>" +
               "<div class='requirement_supply " + supplyClassName + "'>" +
                 "<span class='supply_count'>" + requirement.supply + "</span>" +
                   "/" +
                 "<span class='requirement_count'>" + count + "</span>" +
               "</div>" +
             "</div>"

    return el
  }

  buildRequirementsLabel(type, missingRequirements) {
    const requirements = Item.getRequirements(type)

    let buildSpeed =  this.game.sector.buildSpeed

    let result = []

    for (let name in requirements) {
      let count = requirements[name]
      count = Math.ceil(count / buildSpeed)
      let label = count + " x " + name

      if (missingRequirements[name]) {
        result.push("<span class='missing_requirement'>" + label + "</span>")
      } else {
        result.push(label)
      }
    }

    return result.join(", ")
  }

  createInventorySlots(count, baseIndex) {
    let el = ""

    for (var i = 0; i < count; i++) {
      el += this.createInventorySlot(i, baseIndex)
    }

    return el
  }

  createInventorySlot(index, baseIndex = 0) {
    let absoluteIndex = baseIndex + index
    return  "<div class='inventory_slot' data-index='" + absoluteIndex + "'><img src=''></div>"
  }

  unhighlightInventorySlot(inventorySlot) {
    const activeInventorySlot = inventorySlot || this.el.querySelector(".inventory_slot.active")
    if (activeInventorySlot) {
      activeInventorySlot.className = "inventory_slot"
    }
  }

  highlightInventorySlot(inventorySlot) {
    inventorySlot.className = "inventory_slot active"
  }

  hasPlayerInventory() {
    return false
  }

  updateStorageInventory(data) {
    let storageEl = this.el.querySelector(".storage[data-storage-id='" + data.id + "']")
    if (!storageEl) return

    Array.from(storageEl.querySelectorAll(".inventory_slot")).forEach((inventorySlot) => {
      let isNotDraggableMirror = inventorySlot.className.indexOf("draggable-mirror") === -1
      if (isNotDraggableMirror) {
        this.game.resetInventorySlot(inventorySlot)
      }
    })

    for (let index in data.inventory.storage) {
      let inventory = data.inventory.storage[index]
      if (inventory) {
        let inventorySlot = storageEl.querySelector(".inventory_slot[data-index='" + inventory.index + "']")
        if (inventorySlot) {
          this.game.renderInventorySlot(inventorySlot, inventory)
        }
      }
    }

    if (this.entity && this.entity.getId() === data.id) {
      this.storage = data.inventory.storage
    }
    

    this.onStorageInventoryUpdated()
  }

  onStorageInventoryUpdated() {

  }

  storeInventorySlot(e) {
    if (this.game.isDragging) return
    if (this.game.main.isMobile) return
    if (!this.game.storageMenu.isOpen()) return

    if (this.game.isHoldItemDeletedRecently) {
      this.game.isHoldItemDeletedRecently = false
      return
    }

    let sourceIndex = e.target.closest(".inventory_slot").dataset.index

    let data = {
      sourceStorageId: Constants.inventoryStorageId,
      sourceIndex: sourceIndex,
      destinationStorageId: this.game.storageMenu.storageId
    }

    SocketUtil.emit("SwapInventory", data)
  }


  isStorageMenu() {
    return false
  }

  retrieveInventorySlot(event) {
    if (this.game.isDragging) return
      
    if (!this.game.main.isMobile) {
      let sourceStorageId = event.target.closest(".storage").dataset.storageId
      let sourceIndex = event.target.closest(".inventory_slot").dataset.index
      let destinationStorageId = Constants.inventoryStorageId

      let data = {
        sourceStorageId: sourceStorageId,
        sourceIndex: sourceIndex,
        destinationStorageId: destinationStorageId
      }

      SocketUtil.emit("SwapInventory", data)
    }

  }


  unhighlightTemplateRow(templateRow) {
    if (templateRow) {
      templateRow.className = "template_row"
      return
    }

    const activeRow = this.el.querySelector(".template_row.active")
    if (activeRow) {
      activeRow.className = "template_row"
    }
  }

  highlightTemplateRow(templateRow) {
    templateRow.className = "template_row active"
  }

  onMenuInteract(cmd) {

  }

  createTemplateRow(klass, group) {
    let type = klass.getType()
    let imgSrc = "/assets/images/" + Item.getSpritePath(type)

    let categoryData = group ? "data-construction-type='" + group + "'" : ""
    let el = "<div class='template_row' data-type='" + type + "' " + categoryData + ">" +
      "<img src='" + imgSrc + "'>" +
      "<div class='template_info'>" +
        "<div class='template_name'>" + i18n.t(klass.getCraftTypeName()) + "</div>" +
      "</div>" +
    "</div>"

    return el
  }

}

module.exports = BaseMenu
