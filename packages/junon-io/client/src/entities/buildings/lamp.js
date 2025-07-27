const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const SocketUtil = require("./../../util/socket_util")
const ClientHelper = require("./../../util/client_helper")

class Lamp extends BaseBuilding {

  onClick(event) {
    super.onClick(event)

    if (debugMode) {
      this.handleDoubleClick(() => {
        this.game.lightPathMenu.open(this)
      })
    }
  }

  getEntityMenuStats() {
    let el = super.getEntityMenuStats()

    el += this.getColorStat()
    el += this.getRadiusStat()

    return el
  }

  getColorStat() {
    let value = this.getLightColor()
    let color = this.getColorMap()[value]
    if (!color) {
      color = value
    }

    let el = "<div class='entity_stats_entry lamp_color_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Color') + ":</div>" +
                  "<div class='stats_value'>" + color  + "</div>" +
              "</div>"
    return el
  }

  getRadiusStat() {
    let radius = this.getLightRadius()

    let el = "<div class='entity_stats_entry lamp_radius_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Intensity') + ":</div>" +
                  "<div class='stats_value'>" + radius  + "</div>" +
              "</div>"
    return el
  }

  shouldShowInteractTooltip() {
    if (this.game.player.isGuest()) return false
      
    return super.shouldShowInteractTooltip()
  }

  showAction(entityMenu) {
    const colorPalette = this.buildColorPalette()
    const radiusSlider = this.buildRadiusSlider()

    let actions = ""

    let team = this.game.player.getTeam()
    if (team && team.hasMember(this.game.player) && !this.game.player.isGuest()) {
      actions += colorPalette
      actions += radiusSlider
      
      entityMenu.querySelector(".entity_action").innerHTML = actions
      entityMenu.querySelector(".color_palette_container").addEventListener("click", this.onColorPaletteClick.bind(this), true)
      entityMenu.querySelector(".lamp_color_picker").addEventListener("change", this.onColorPickerChanged.bind(this), true)
      entityMenu.querySelector(".light_radius_container input").addEventListener("change", this.onLightRadiusChanged.bind(this), true)
    }


    if (this.content) {
      let color = this.getLightColor()
      let colorItem = entityMenu.querySelector(`.color_item[data-value='${color}']`)
      if (colorItem) {
        this.selectColorItem(colorItem)
      }
    }
  }

  onColorPaletteClick(e) {
    let colorItem = e.target.closest(".color_item")
    if (colorItem) {
      SocketUtil.emit("EditBuilding", { id: this.id, content: colorItem.dataset.value })
      return
    }
  }

  onColorPickerChanged(e) {
    let color = e.target.value
    let radius = this.getLightRadius()
    let content = this.content ? [color, radius].join(":") : color
    SocketUtil.emit("EditBuilding", { id: this.id, content: content })
    this.unselectColorItem()
  }

  onLightRadiusChanged(e) {
    let color = this.getLightColor()
    let radius = e.target.value
    let content = [color, radius].join(":") 
    SocketUtil.emit("EditBuilding", { id: this.id, content: content })
    this.unselectColorItem()
  }

  selectColorItem(colorItem) {
    this.unselectColorItem()
    colorItem.classList.add("selected")
  }

  unselectColorItem() {
    let selectedItem = document.querySelector(".color_palette_container .color_item.selected")
    if (selectedItem) {
      selectedItem.classList.remove("selected")
    }
  }

  getLightRadius() {
    if (!this.content) {
      return super.getLightRadius()
    } else {
      let radius = this.content.split(":")[1]
      if (radius) {
        return parseInt(radius) > 50 ? 50 : parseInt(radius) //50 is a nice number, this wouldn't cause any server lag if abused anyhow.
      } else {
        return super.getLightRadius()
      }
    }
  }

  buildRadiusSlider() {
    let radius = this.getLightRadius()
    return "<div class='light_radius_container'>" + 
             "<span>Intensity:</span>" +
             "<input type='range' min='3' max='15' value='" + radius + "' />" + 
           "</div>"
  }

  buildColorPalette() {
    let colorMap = this.getColorMap()
    let el = "<div class='color_palette_container'>"

    for (let value in colorMap) {
      let color = colorMap[value]
      el += this.createPalette(color, value)
    }

    let defaultColor = this.content ? this.getLightColor() : '#000000'

    let customColor = "<div class='lamp_color_picker_container'>" + 
                        "<span>Custom</span>" + 
                        "<input type='color' class='lamp_color_picker' value='" + defaultColor + "'>" +
                      "</div>"
    el += customColor

    el += "</div>"

    return el
  }

  getColorMap() {
    return { 
      "#00ff00": "Green",
      "#07c57c": "DarkGreen",
      "#ffff00": "Yellow",
      "#ff00ff": "Magenta",
      "#00ffff": "Cyan",
      "#3965ac": "Blue",
      "#ffffff": "White",
      "#a90013": "Red",
      "#fb2841": "LightRed",
      "#f6751b": "Orange",
      "#a79161": "Bronze"
    }
  }

  onContentChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }

    this.unassignLighting()
    this.renderLighting()
  }

  createPalette(color, value) {
    let el = `<div class='color_item' data-color='${color}' data-value='${value}' style='background-color: ${value};'>` + 
             "</div>"
    return el
  }

  isEquipment() {
    return this.data.user
  }

  onOpenChanged() {
    super.onOpenChanged()
    this.renderLighting()
  }

  onPowerChanged() {
    super.onPowerChanged()

    this.renderLighting()
  }

  renderLighting() {
    if (this.isOpen && this.isPowered) {
      this.assignLighting()
      this.buildingSprite.tint = ClientHelper.hexToInt(this.getLightColor())
    } else {
      this.unassignLighting()
      this.buildingSprite.tint = 0xaaaaaa
    }
  }

  getLightColor() {
    if (this.content) {
      return this.content.split(":")[0]
    } else {
      return this.getConstants().lightColor
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Lamp
  }

  getSpritePath() {
    return "lamp_2.png"
  }

  getConstantsTable() {
    return "Buildings.Lamp"
  }

}

module.exports = Lamp
