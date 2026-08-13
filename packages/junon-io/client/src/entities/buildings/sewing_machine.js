const Equipments = require("./../equipments/index")
const CarpetFloor = require("./platforms/carpet_floor")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SewingMachine extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = [Equipments.StrawHat, Equipments.CowboyHat, Equipments.JesterHat, Equipments.PrisonerSuit, Equipments.PoliceSuit, Equipments.LabCoat, Equipments.CultistSuit, Equipments.NobleSuit, CarpetFloor]

    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    this.game.craftMenu.open("Sewing Machine", "Craft", this.id, templateList, options)
  }

  getType() {
    return Protocol.definition().BuildingType.SewingMachine
  }

  getSpritePath() {
    return "sewing_machine.png"
  }

  getConstantsTable() {
    return "Buildings.SewingMachine"
  }

}

module.exports = SewingMachine
