const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Foods = require("./../foods/index")
const Ores = require("./../ores/index")
const Equipments = require("./../equipments/index")

class ChemistryStation extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = Foods.getDrugs().concat([Ores.Explosives])

    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    this.game.craftMenu.open("Chemistry Station", "Craft", this.id, templateList, options)
  }

  getType() {
    return Protocol.definition().BuildingType.ChemistryStation
  }

  getSpritePath() {
    return "chemistry_station.png"
  }

  getConstantsTable() {
    return "Buildings.ChemistryStation"
  }

}

module.exports = ChemistryStation
