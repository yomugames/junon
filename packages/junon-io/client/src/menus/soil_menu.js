const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Mobs = require("./../entities/mobs/index")
const Ores = require("./../entities/ores/index")
const Item = require("./../entities/item")
const Buildings = require("./../entities/buildings/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")

/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class SoilMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".crop_selection_container").addEventListener("click", this.onCropSelectionClick.bind(this) , true)
  }

  onCropSelectionClick(e) {
    let el = e.target.closest(".crop_selection")
    if (!el) return

    this.changeCropSelection(el.dataset.type)
  }

  selectCrop(el) {
    let selectedItem = this.el.querySelector(".crop_selection.selected")
    if (selectedItem) {
      selectedItem.classList.remove("selected")
    }

    el.classList.add("selected")
  }

  changeCropSelection(type) {
    SocketUtil.emit("EditBuilding", { id: this.entity.id, content: type })
  }

  open(options = {}) {
    super.open()

    this.entity = options.entity
    this.render()
  }

  render() {
    if (!this.entity) return
    this.renderSeedSelection()
    this.renderSelected()
  }

  renderSeedSelection() {
    let el = ""
    for (let name in Buildings.Crops) {
      let cropKlass = Buildings.Crops[name]
      el += this.createCropSelection(cropKlass)
    }

    this.el.querySelector(".crop_selection_container").innerHTML = el
  }

  renderSelected() {
    let type = this.entity.content
    if (!type) return

    let cropSelection = this.el.querySelector(".crop_selection[data-type='" + type + "']") 
    if (cropSelection) {
      this.el.querySelector(".crop_selection_name").innerText = cropSelection.dataset.name
      this.selectCrop(cropSelection)
    }
  }

  createCropSelection(klass) {
    let yieldName = klass.prototype.getConstants().yield
    let yieldKlass = Item.getKlassByName(yieldName)
    let imagePath = "/assets/images/" + yieldKlass.prototype.getSpritePath()

    const el = "<div class='crop_selection' data-type='" + klass.getType() + "' data-name='" + i18n.t(yieldKlass.getTypeName()) + "' >" +
                    "<img class='crop_image' src='" + imagePath + "'>" +
                "</div>"

    return el
  }

}

module.exports = SoilMenu