const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Item = require("./../entities/item")
const GeminiScrollbar = require('gemini-scrollbar')
// const SimpleBar = require("simplebar")
// const PerfectScrollbar = require("perfect-scrollbar")
const Constants = require("./../../../common/constants.json")


class CraftMenu extends BaseMenu {
  onMenuConstructed() {
    this.lastActiveRows = {}
  }

  onInventoryChanged() {
    if (!this.craftType) return

    this.showProductInfo(this.craftType)    
  }

  animateUnlockSuccess(data) {
    const itemName = data.name;
    const friendlyItemName = itemName.replace(/([A-Z])/g, ' $1').trim();
    const label = "Unlocked " + i18n.t(friendlyItemName);

    const style = { fontFamily: 'PixelForce', fontSize: 28, fill: 0x00ff00, align: 'center', stroke: "#000000", strokeThickness: 5, miterLimit: 3 };
    let text = document.createElement("span");
    text.className = "craft_success_label";
    text.innerText = label;
    document.body.appendChild(text);

    text.style.top = data.y + "px";
    text.style.left = data.x + "px";

    let position = { y: data.y };
    var tween = new TWEEN.Tween(position)
      .to({ y: data.y - 150 }, 1500)
      .onUpdate(() => {
        text.style.top = position.y + "px";
      })
      .onComplete(() => {
        document.body.removeChild(text);
      })
      .start();
  }

  getStorage() {
    return document.querySelector("#player_inventory")
  }

  open(header, label, storageId, templateList, options = {}) {
    super.open()
    this.cleanup()

    this.initCraftMenu(header, label, storageId, templateList, options)
  }

  initCraftMenu(header, label, storageId, templateList, options = {}) {
    this.header = header
    this.el.querySelector("#crafting_container_header").innerText = i18n.t(header)
    this.el.querySelector(".craft_btn").innerText = i18n.t(label)
    this.el.querySelector(".craft_btn").dataset.disabled = true

    this.sourceStorageId = storageId

    if (options.disabled) {
      this.isDisabled = true
      this.el.querySelector("#crafting_status_message").innerText = i18n.t(options.disabled)
    } else {
      this.isDisabled = false
      this.el.querySelector("#crafting_status_message").innerText = ""
    }

    if (header === "Forge") {
      this.el.querySelector(".craft_count").value = "1"
      this.el.querySelector(".craft_count").disabled = true
    } else {
      this.el.querySelector(".craft_count").disabled = false
    }

    let tabContainer = this.el.querySelector("#crafting_template_container")
    tabContainer.dataset.constructionType = header
    this.lastActiveTabContainer = tabContainer

    for (let i = 0; i < templateList.length; i++) {
      let klass = templateList[i]
      let row = this.createTemplateRow(klass)
      tabContainer.innerHTML += row
    }

    // this.scrollBar.update()
    this.scrollBar = new GeminiScrollbar({
        element: tabContainer,
        autoshow: true,
        forceGemini: true
    }).create()

    this.renderLastSelectedTemplateRow()
  }

  cleanup() {
    this.unhighlightInventorySlot()

    this.el.querySelector("#crafting_template_container").innerHTML = ""
    this.craftType = null
  }

  getStorageId() {
    return Constants.inventoryStorageId
  }

  initListeners() {
    super.initListeners()

    this.initCraftBtnListeners()
    this.initCraftTemplateListeners()
  }

  initCraftBtnListeners() {
    this.el.querySelector(".craft_count").addEventListener("change", this.onCraftCountChange.bind(this), true)
    this.el.querySelector(".craft_count").addEventListener("input", this.onCraftCountInput.bind(this), true)
    this.el.querySelector(".craft_count").addEventListener("keydown", this.onCraftCountKeydown.bind(this), true)
    this.el.querySelector(".craft_count").addEventListener("keyup", this.onCraftCountKeyup.bind(this), true)
    this.el.querySelector(".craft_btn").addEventListener("mousedown", this.onCraftBtnHold.bind(this), true)
    this.el.querySelector(".craft_btn").addEventListener("mouseup", this.onCraftBtnRelease.bind(this), true)
    this.el.querySelector(".craft_btn").addEventListener("mouseout", this.onCraftBtnRelease.bind(this), true)
  }

  onCraftCountKeydown(e) {
    this.oldCraftCount = parseInt(e.target.value)
  }

  onCraftCountInput(e) {
    let maxLength = 2
    if (e.target.value.length > maxLength) {
      e.target.value = e.target.value.slice(0, maxLength)
    }
  }

  onCraftCountChange(e) {
    if (e.target.value.length === 0) {
      e.target.value = 1
    }
  }

  onCraftCountKeyup(e) {
    if (e.target.value.length === 0) return

    let number = parseInt(e.target.value)
    if (isNaN(number) || number < 1 || number > 99) {
      e.target.value = this.oldCraftCount
    } 

    if (e.key === "Enter") {
      this.onCraftBtnHold()
    }

    if (e.keyCode === 27) {
      this.game.inputController.handleEsc()
    }
  }

  initCraftTemplateListeners() {
    this.el.querySelector("#crafting_template_container").addEventListener("click", this.onCraftingTemplateClick.bind(this), true)
  }

  selectTemplateRow(constructionType, templateRow) {
    this.craftType = templateRow.dataset.type
    // this.highlightTemplateRow(templateRow)
    // this.showProductInfo(this.craftType)

    templateRow.tabIndex = -1
    templateRow.click()
    templateRow.focus()

    this.lastActiveRows[constructionType] = templateRow
  }

  renderLastSelectedTemplateRow(constructionType) {
    let lastActiveRowForTab = constructionType && this.getLastActiveRow(constructionType)
    if (lastActiveRowForTab) {
       let templateRow = lastActiveRowForTab
       this.selectTemplateRow(constructionType, templateRow)
    } else {
      // select first slot
      let categoryFilter = constructionType ? "[data-construction-type='" + constructionType + "']" : ""
      let templateRow = this.el.querySelector(".template_row" + categoryFilter)
      this.selectTemplateRow(constructionType, templateRow)
    }
  }



  onCraftSuccess(data) {
    let rect = this.el.querySelector(".craft_btn").getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left - 50

    this.game.animateCraftSuccess(data)
  }

  onCraftingTemplateClick(event) {
    this.lastActiveRows[this.header] = this.handleTemplateClick(event)
  }

  handleTemplateClick(event) {
    const templateRow = event.target.closest(".template_row")
    if (!templateRow) return

    const type = parseInt(templateRow.dataset.type)
    if (isNaN(type)) return

    this.craftType = type

    this.unhighlightTemplateRow()
    this.highlightTemplateRow(templateRow)
    this.showProductInfo(this.craftType)
    this.onTemplateRowSelected(templateRow)

    return templateRow
  }

  onTemplateRowSelected(templateRow) {

  }

  /*

  Keyboard shortcuts

  */

  onMenuInteract(cmd) {
    switch(cmd) {
      case "ShiftTab":
        this.onShiftTab()
        break
      case "Tab":
        this.onTab()
        break
      case "GoUp":
        this.onGoUp()
        break
      case "GoDown":
        this.onGoDown()
        break
      case "EnterDown":
        this.onEnterDown()
        break
      case "EnterUp":
        this.onEnterUp()
        break
    } 
  }

  onEnterDown() {
    this.onCraftBtnHold()
  }

  onEnterUp() {
    this.onCraftBtnRelease()
  }

  onShiftTab() {
    this.onTabDirection(-1)
  }

  onTab() {
    this.onTabDirection(1)
  }

  onTabDirection(direction) {
    let tabs = Array.from(this.el.querySelectorAll(".construction_tab"))
    if (tabs.length <= 1) return

    let tabIndex = Array.prototype.indexOf.call(tabs, this.lastActiveTab)
    
    if (direction > 0) {
      // next
      let isLastTab = tabIndex === tabs.length - 1
      if (isLastTab) {
        this.selectConstructionTab(tabs[0])
      } else {
        this.selectConstructionTab(tabs[tabIndex + 1])
      }
    } else {
      // prev
      let isFirstTab = tabIndex === 0
      if (isFirstTab) {
        this.selectConstructionTab(tabs[tabs.length - 1])
      } else {
        this.selectConstructionTab(tabs[tabIndex - 1])
      }
    }
  }

  onGoUp() {
    this.onGoDirection(-1)
  }

  onGoDown() {
    this.onGoDirection(1)
  }

  getLastActiveTabContainer() {
    return this.lastActiveTabContainer
  }

  getLastActiveRow(constructionType) {
    let lastActiveRowForTab = this.lastActiveRows[constructionType]
    if (!lastActiveRowForTab) return null

    let type = lastActiveRowForTab.dataset.type

    // we create new instance of elemes for craft menu. so we need select newly built one
    return this.el.querySelector(".template_row[data-type='" + type + "']")
  }

  onGoDirection(direction) {
    let activeTab = document.querySelector(".construction_tab.active")
    let constructionType = activeTab.dataset.tab
    let rows = Array.from(this.el.querySelectorAll(".template_row[data-construction-type='" + constructionType + "']"))
    let lastActiveRowForTab = this.getLastActiveRow(constructionType)
    let rowIndex = Array.prototype.indexOf.call(rows, lastActiveRowForTab)
    this.unhighlightTemplateRow(lastActiveRowForTab)

    if (direction > 0) {
      // going down
      let isLastRow = rowIndex === rows.length - 1
      if (isLastRow) {
        this.selectTemplateRow(constructionType, rows[0])
      } else {
        this.selectTemplateRow(constructionType, rows[rowIndex + 1])
      }
    } else {
      let isFirstRow = rowIndex === 0
      if (isFirstRow) {
        this.selectTemplateRow(constructionType, rows[rows.length - 1])
      } else {
        this.selectTemplateRow(constructionType, rows[rowIndex - 1])
      }
    }
  }


}



module.exports = CraftMenu