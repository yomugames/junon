const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipments = require("./../equipments/index")

class Workshop extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = Equipments.getList()
    this.game.craftMenu.open("Workshop", "Craft", this.id, templateList)
  }

  getType() {
    return Protocol.definition().BuildingType.Workshop
  }

  getSpritePath() {
    return "workshop.png"
  }

  getConstantsTable() {
    return "Buildings.Workshop"
  }

}

module.exports = Workshop
