const SocketUtil = require("./../util/socket_util")
const CraftMenu = require("./craft_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const Buildings = require("./../entities/buildings/index")
const Terrains = require("./../entities/terrains/index")
const Equipments = require("./../entities/equipments/index")
const Item = require("./../entities/item")
const GeminiScrollbar = require('gemini-scrollbar')

class BlueprintMenu extends CraftMenu {

  onMenuConstructed() {
    this.lastActiveRows = {}
    this.initCrafting()

    this.terrainNames = Terrains.getList().map((klass) => {
      return klass.getCraftTypeName()
    })
  }

  initCraftTemplateListeners() {
    let elements = Array.from(this.el.querySelectorAll(".construction_category"))
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      el.addEventListener("click", this.onBlueprintTemplateClick.bind(this), true)
    }

    elements = Array.from(this.el.querySelectorAll(".construction_tab"))
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      el.addEventListener("click", this.onConstructionTabClick.bind(this), true)
    }

    this.el.querySelector(".blueprint_search_input").addEventListener("keyup", this.onBlueprintSearchKeyup.bind(this), true)
  }

  canCraftItemName(itemName) {
    if (this.terrainNames.indexOf(itemName) !== -1) {
      if (this.game.sector.isPeaceful() && this.game.player.isSectorOwner()) {
        return true
      } else {
        return false
      }
    }

    return true
  }

  onBlueprintSearchKeyup(e) {
    let text = e.target.value
    if (text.length > 0) {
      // search mode
      this.el.querySelector(".construction_category").dataset.searching = 'true'
    } else {
      this.el.querySelector(".construction_category").removeAttribute("data-searching")
    }

    let prevSearchedRows = this.el.querySelectorAll(".template_row[data-searched='true']")
    for (var i = 0; i < prevSearchedRows.length; i++) {
      let el = prevSearchedRows[i]
      el.removeAttribute("data-searched")
    }

    let templateNameElements = this.el.querySelectorAll(".template_row .template_name")
    let matchCount = 0
    for (var i = 0; i < templateNameElements.length; i++) {
      let el = templateNameElements[i]
      let isSearchMatched = false
      if (this.canCraftItemName(el.innerText)) {
        try {
          isSearchMatched = el.innerText.toLowerCase().match(text.toLowerCase())
        } catch(e) {
        }
      }
      
      if (isSearchMatched) {
        matchCount += 1
        el.closest(".template_row").dataset.searched = 'true'
      }
    }

    if (matchCount === 0) {
      this.el.querySelector(".search_empty_state").dataset.visible = true
    } else {
      this.el.querySelector(".search_empty_state").removeAttribute("data-visible")
    }

    // esc
    if (e.keyCode === 27) {
      this.close()
    }

  }

  open() {
    if (!this.game.player) return
      
    super.open()
    
    let defaultTab 

    if (this.game.sector.isPeaceful() && this.game.player.isSectorOwner()) {
      this.el.querySelector(".construction_tab[data-tab='Terrains']").style.display = 'inline-block'
      defaultTab = document.querySelector(".construction_tab[data-tab='Terrains']")
    } else {
      this.el.querySelector(".construction_tab[data-tab='Terrains']").style.display = 'none'
      defaultTab = document.querySelector(".construction_tab[data-tab='equipments']")
    }

    let lastTab = this.lastActiveTab || defaultTab
    this.selectConstructionTabAndHighlightRow(lastTab)
  }

  initCraftMenu() {
    // dont do anything, already initialized..
  }

  cleanup() {
    this.unhighlightTemplateRow()
    this.craftType = null
    this.lastActiveTab = null
  }

  initCrafting() {
    this.el.querySelector("#blueprint_main_container").innerHTML = this.getCraftingListContainer()

    this.buildSearchInput()
  }

  buildSearchInput() {
    let search = "<div class='blueprint_search_container'>" + 
                    "<img src='/assets/images/search_icon.png'>" +
                    "<input type='text' class='blueprint_search_input'></text>" +
                 "</div>"
    this.el.querySelector("#blueprint_main_container").innerHTML += search
  }

  buildEquipmentMenu() {
    let group = "equipments"
    let equipmentKlasses = Equipments.getList()
    let el = this.buildBlueprintInventorySlots(equipmentKlasses, group)


    return {
      group: group,
      el: el
    }
  }

  buildBlueprintInventorySlots(klasses, group) {
    let inventories = ""

    klasses.forEach((klass) => {
      inventories += this.createTemplateRow(klass, group)
    })

    return inventories
  }

  buildTerrainSlots(klasses, group) {
    let rows = ""

    klasses.forEach((klass) => {
      rows += this.createTemplateRow(klass, group)
    })

    return rows
  }

  buildTab(groups) {
    // make tab buttons
    let tabs = ""
    for (var i = 0; i < groups.length; i++) {
      let group = groups[i]
      let tabEl =  "<div class='construction_tab tab_btn' data-tab='" + group + "'><img src='" + this.getIconImagePathForGroup(group) + "'>" + 
                     "<div class='game_tooltip'>" + i18n.t(group) + "</div>" +
                   "</div>"
      tabs += tabEl
    }

    tabs = "<div class='construction_tabs'>" + tabs + "</div>"

    return tabs
  }

  getIconImagePathForGroup(group) {
    return "/assets/images/" + group.toLowerCase() + "_icon.png"
  }

  updateAllowedCraftables() {
  }

  getFloorKlasses(klasses) {
    let outdatedKlasses = ["WoodFloor", "SteelFloor", "BlueFloor", "GreenFloor", "PurpleFloor", "YellowFloor", "BronzeFloor", "GrayFloor", "PinkFloor", "PlatedFloor", "StripePlatedFloor"]
    return klasses.filter((klass) => {
      let klassName = Protocol.definition().BuildingType[klass.getType()]
      let isOutdated = outdatedKlasses.indexOf(klassName) !== -1 
      return !isOutdated
    })
  }

  getCraftingListContainer() {
    let groups = []
    let containers = ""

    let group = "Terrains"
    groups.push(group)
    let el  = this.buildTerrainSlots(Terrains.getList(), group)
    containers += el

    let menu = this.buildEquipmentMenu()
    groups.push(menu.group)

    for (let group in Buildings) {
      if (typeof Buildings[group] === "function") continue // ignore helpers
      if (Buildings.getExcludeCraftingGroups().indexOf(group) !== -1) continue

      groups.push(group)

      let buildingKlasses = Object.values(Buildings[group])
      if (group === 'Floors') {
        buildingKlasses = this.getFloorKlasses(buildingKlasses)  
      }
      let el = this.buildBlueprintInventorySlots(buildingKlasses, group)

      containers += el
    }


    containers += menu.el

    let tabs = this.buildTab(groups)

    let emptyState = "<div class='search_empty_state'>" + i18n.t('No results') + "</div>"

    containers = "<div class='construction_category'>" + emptyState + containers + "</div>"

    return tabs + containers
  }

  onBlueprintTemplateClick(event) {
    let templateRow = this.handleTemplateClick(event)
    if (!templateRow) return

    let constructionType = templateRow.dataset.constructionType
    this.lastActiveRows[constructionType] = templateRow

    let constructionTab = this.el.querySelector(".construction_tab[data-tab='" + constructionType + "']")
    if (constructionTab) {
      this.selectConstructionTab(constructionTab)
    }
  }

  onConstructionTabClick(e) {
    this.selectConstructionTabAndHighlightRow(e.target)
  }

  selectConstructionTabAndHighlightRow(targetElement) {
    targetElement = targetElement.closest(".construction_tab")

    this.selectConstructionTab(targetElement)

    this.unhighlightTemplateRow()
    this.renderLastSelectedTemplateRow(targetElement.dataset.tab)
  }

  selectConstructionTab(targetElement) {
    targetElement = targetElement.closest(".construction_tab")

    this.highlightTab(targetElement)
    this.highlightTabContainer(targetElement.dataset.tab)

    this.lastActiveTab = targetElement
  }

  onTemplateRowSelected(templateRow) {
    if (templateRow.dataset.constructionType === "equipments") {
      this.el.querySelector(".craft_count").value = "1"
      this.el.querySelector(".craft_count").disabled = true
    } else {
      this.el.querySelector(".craft_count").disabled = false
    }

  }

  getLastActiveTabContainer() {
    let constructionType = this.lastActiveTab.dataset.tab
    return this.el.querySelector(".construction_category[data-construction-type='" + constructionType + "']")
  }

  getLastActiveRow(constructionType) {
    return this.lastActiveRows[constructionType]
  }

  highlightTab(targetElement) {
    let activeTab = document.querySelector(".construction_tab.active")
    if (activeTab) {
      activeTab.classList.remove("active")
    }

    targetElement.classList.add("active")
  }

  highlightTabContainer(group) {
    let elements = Array.from(document.querySelectorAll(".template_row[data-categorized='true']"))
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]
      el.removeAttribute("data-categorized")
    }

    let rows = document.querySelectorAll(".template_row[data-construction-type='" + group + "']")
    for (let i = 0; i < rows.length; i++) {
      let el = rows[i]
      el.dataset.categorized = 'true'
    }
  }

}

module.exports = BlueprintMenu

