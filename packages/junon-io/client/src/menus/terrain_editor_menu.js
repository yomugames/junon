const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const ClientHelper = require("../util/client_helper")
const Terrains = require("../entities/terrains/index")

class TerrainEditorMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".terrain_picker_grid").innerHTML = this.createTerrainPickerGrid()

    // this.el.querySelector(".terrain_value").innerText = ""
  }

  setColorIndex(colorIndex) {
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

    let label = this.game.colors[this.colorIndex].label
    this.el.querySelector(".picker_color_value").innerText = label
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".terrain_picker_grid").addEventListener("click", this.onTerrainPickerGridClick.bind(this), true)
  }

  open(options = {}) {
    super.open(options)
  }

  onTerrainPickerGridClick(e) {
    let cell = e.target.closest(".color_cell")
    if (cell) {
      let colorIndex = cell.dataset.index
      SocketUtil.emit("EditTexture", { colorIndex: colorIndex })
    }
  }

  createTerrainPickerGrid() {
    let el = ""

    let terrains = Terrains.getList()
    for (let index in terrains) {
      let klass = terrains[index]
      el += this.createColorCellEl(index, color)
    }

    return el
  }

  createColorCellEl(index, color) {
    let hex = ClientHelper.toHex(color.value)
    return `<div class='color_cell' data-index='${index}' style='background-color: ${hex}'></div>`
  }


}



module.exports = TerrainEditorMenu 