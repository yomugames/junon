const BaseBuilding = require("./base_building")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const Helper = require("../../../../common/helper")
const Wire = require("./wire")
const BitmapText = require("../../util/bitmap_text")

class DrugStation extends BaseBuilding {
constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
    this.slotCount = 3
  }

  openMenu() {
    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    let shouldHideInput = false
    this.game.processorMenu.open("Drug Station", this, this.getMenuDescription(), shouldHideInput, "", options)
  }

  getMenuDescription() {
    return this.content || super.getMenuDescription()
  }

  onContentChanged() {
    let menu = this.game.processorMenu
    if (menu.isOpen() && menu.storageId === this.id) {
      menu.setDescription(this.getMenuDescription())
    }
  }

  getType() {
    return Protocol.definition().BuildingType.DrugStation
  }

  getSpritePath() {
    return "drug_station.png"
  }

  getConstantsTable() {
    return "Buildings.DrugStation"
  }
}

module.exports = DrugStation
