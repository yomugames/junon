const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const ClientHelper = require("../util/client_helper")

class ColorPickerMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".picker_color_value").innerText = "white_1"
    this.colors = {}

    if (this.el.querySelector(".picker_texture_value")) {
      this.el.querySelector(".picker_texture_value").innerText = "solid_texture"
    }
  }

  setColorIndex(colorIndex) {
    if (!this.colors[colorIndex]) return
    this.colorIndex = colorIndex

    let cell = this.el.querySelector(".color_cell[data-index='" + this.colorIndex + "']")
    if (cell) {
      let selectedCell = this.el.querySelector(".color_cell.selected")
      if (selectedCell) {
        selectedCell.classList.remove("selected")
      }

      cell.classList.add("selected")
    }

    if (this.game.player.building) {
      this.applyBuildingTint(this.game.player.building)
    }

    let label = this.colors[this.colorIndex].label
    this.el.querySelector(".picker_color_value").innerText = label
  }

  setTextureIndex(textureIndex) {
    this.textureIndex = textureIndex

    let cell = this.el.querySelector(".texture_cell[data-index='" + this.textureIndex + "']")
    if (cell) {
      let selectedCell = this.el.querySelector(".texture_cell.selected")
      if (selectedCell) {
        selectedCell.classList.remove("selected")
      }

      cell.classList.add("selected")
    }

    if (this.game.player.building) {
      this.applyBuildingTexture(this.game.player.building)
    }

    let label = this.game.floorTextures[this.textureIndex]
    this.el.querySelector(".picker_texture_value").innerText = label
  }

  applyBuildingTint(building) {
    let floorWallTypes = [Protocol.definition().BuildingType.Floor, Protocol.definition().BuildingType.Wall]
    let isFloorOrWall = floorWallTypes.indexOf(building.getType()) !== -1
    if (isFloorOrWall) {
      if (this.colorIndex) {
        building.setColorIndex(this.colorIndex)
        let value = this.game.colors[this.colorIndex].value
        building.baseSprite.tint = value
      }
    }
  }

  applyBuildingTexture(building) {
    let floorWallTypes = [Protocol.definition().BuildingType.Floor, Protocol.definition().BuildingType.Wall]
    let isFloorOrWall = floorWallTypes.indexOf(building.getType()) !== -1
    if (isFloorOrWall) {
      if (this.textureIndex) {
        building.setTextureIndex(this.textureIndex)
        let value = this.game.floorTextures[this.textureIndex]
        building.baseSprite.texture = PIXI.utils.TextureCache[value]
      }
    }
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".color_picker_grid").addEventListener("click", this.onColorPickerGridClick.bind(this), true)
    if (this.el.querySelector(".texture_picker_grid")) {
      this.el.querySelector(".texture_picker_grid").addEventListener("click", this.onTexturePickerGridClick.bind(this), true)
    }
    
    this.el.querySelector(".color_picker_tab_container").addEventListener("click", this.onTabClick.bind(this))
  }

  open(options = {}) {
    super.open(options)

    this.colors = options.colors
    this.entityId = options.entityId

    this.render()
  }

  onTabClick(e) {
    let tab = e.target.closest(".picker_tab")
    if (!tab) return

    let customize = tab.dataset.customize
    let selectedTab = this.el.querySelector(".picker_tab.selected")
    let selectedTabContent = this.el.querySelector(".tab-pane.selected")
    if (selectedTab) {
      selectedTab.classList.remove("selected")
      if (selectedTabContent) {
        selectedTabContent.classList.remove("selected")
      }
    }

    tab.classList.add("selected")
    let tabContent = this.el.querySelector(".tab-pane[data-customize='" + customize + "']")
    if (tabContent) {
      tabContent.classList.add("selected")
    }
  }

  onColorPickerGridClick(e) {
    let cell = e.target.closest(".color_cell")
    if (cell) {
      let colorIndex = cell.dataset.index
      SocketUtil.emit("EditTexture", { colorIndex: colorIndex, entityId: this.entityId  })
    }
  }

  onTexturePickerGridClick(e) {
    let cell = e.target.closest(".texture_cell")
    if (cell) {
      let textureIndex = cell.dataset.index
      SocketUtil.emit("EditTexture", { textureIndex: textureIndex, entityId: this.entityId })
    }
  }

  createColorPickerGrid() {
    let el = ""

    for (let index in this.colors) {
      let color = this.colors[index]
      el += this.createColorCellEl(index, color)
    }

    return el
  }

  createColorCellEl(index, color) {
    let hex = ClientHelper.toHex(color.value)
    return `<div class='color_cell' data-index='${index}' style='background-color: ${hex}'></div>`
  }

  createTexturePickerGrid() {
    let el = ""

    for (let index in this.game.floorTextures) {
      let texture = this.game.floorTextures[index]
      el += this.createTextureCellEl(index, texture)
    }

    return el
  }

  createTextureCellEl(index, texture) {
    if (texture === 'cornered_texture.png') {
      texture = 'cornered_texture_display.png'
    }
    return `<div class='texture_cell' data-index='${index}'><img src='/assets/images/${texture}'></div>`
  }

  render() {
    this.el.querySelector(".color_picker_grid").innerHTML = this.createColorPickerGrid()

    if (this.el.querySelector(".texture_picker_grid")) {
      this.el.querySelector(".texture_picker_grid").innerHTML = this.createTexturePickerGrid()
    }
    
  }


}



module.exports = ColorPickerMenu 