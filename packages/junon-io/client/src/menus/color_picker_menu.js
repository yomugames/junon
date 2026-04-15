const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const ClientHelper = require("../util/client_helper")

class ColorPickerMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".picker_color_value").innerText = "white_1"
    this.colors = {}

    this.customColorActive = false
    this.customColorHex = "#000000" //it'll always open as #000000 unless we implement a custom color value in a new save file revision, which would be an unnecessary headache.

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
        if (this.colorIndex > 37) {
          let toHex = ClientHelper.toHex(this.colorIndex + 38)
          building.customHex = toHex
        } else {
          building.customHex = null
        }
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
        if(value !== 'simplex_texture.png') building.baseSprite.texture = PIXI.utils.TextureCache[value]
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

    let panel = this.el.querySelector('.more_colors_panel')
    if (panel) {
      let applyBtn = panel.querySelector('.more_colors_apply_btn')
      if (applyBtn) {
        applyBtn.addEventListener('click', (ev) => {
          panel.style.display = 'none'
          this.render();
        })
      }
    }
  }

  open(options = {}) {
    super.open(options)

    // Create a copy of colors and filter out any custom colors that may have persisted
    this.colors = Object.assign({}, options.colors)
    for (let index in this.colors) {
      if (this.colors[index].label && this.colors[index].label.startsWith('#')) {
        delete this.colors[index]
      }
    }
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
    let more = e.target.closest(".more_colors_cell")
    if (more) {
      let tab = this.el.querySelector(".tab-pane.selected")
      if (!tab) return
      let panel = tab.querySelector(".more_colors_panel")
      if (!panel) return

      if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block'
        let input = panel.querySelector('.more_colors_input')
        if (input) {
          input.value = this.customColorHex || '#000000'
          input.oninput = (ev) => {
            let hex = ev.target.value
            this.customColorHex = hex
            let intVal;
            if (this.game && this.game.colors) {
              intVal = parseInt(hex.replace('#',''), 16)
              this.game.colors[intVal + 38] = { index: intVal + 38, value: intVal, label: hex }
            }
            this.colorIndex = intVal? intVal + 38 : 1
            this.customColorActive = true
            this.el.querySelector('.picker_color_value').innerText = hex
            if (this.game.player.building) {
              this.applyBuildingTint(this.game.player.building)
            }
            SocketUtil.emit('EditTexture', { colorIndex: intVal + 38, entityId: this.entityId })
          }
        }
      } else {
        panel.style.display = 'none'
      }

      return
    }

    let cell = e.target.closest(".color_cell")
    if (cell) {
      let colorIndex = cell.dataset.index
      if (colorIndex) {
        this.setColorIndex(colorIndex)
        this.customColorActive = false
        SocketUtil.emit("EditTexture", { colorIndex: colorIndex, entityId: this.entityId })
      }
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

    el += `<div class='color_cell more_colors_cell'>+</div>`

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
    return `<div class='texture_cell' data-index='${index}'><img width="32" height="32" src='/assets/images/${texture}'></div>`
  }

  render() {
    this.el.querySelector(".color_picker_grid").innerHTML = this.createColorPickerGrid()

    if (this.el.querySelector(".texture_picker_grid")) {
      this.el.querySelector(".texture_picker_grid").innerHTML = this.createTexturePickerGrid()
    }
    
  }


}



module.exports = ColorPickerMenu 