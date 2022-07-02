const Equipments = require("./../equipments/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Forge extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = [Equipments.Katana, Equipments.BlueEnergySword, Equipments.GreenEnergySword, Equipments.RedEnergySword, Equipments.SpaceSuit, Equipments.CombatArmor, Equipments.HazmatSuit, Equipments.PrisonerSuit, Equipments.PoliceSuit, Equipments.LabCoat, Equipments.CultistSuit]

    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    this.game.craftMenu.open("Forge", "Craft", this.id, templateList, options)
  }

  getType() {
    return Protocol.definition().BuildingType.Forge
  }

  getSpritePath() {
    return "forge.png"
  }

  getConstantsTable() {
    return "Buildings.Forge"
  }

}

module.exports = Forge
