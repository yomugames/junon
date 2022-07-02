const Ammos = require("./../ammos/index")
const Equipments = require("./../equipments/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AmmoPrinter extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = Ammos.getList()
    templateList.push(Equipments.Grenade)
    templateList.push(Equipments.PoisonGrenade)
    templateList.push(this.sector.getTimerBombKlass())

    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }
    this.game.craftMenu.open("Ammo Printer", "Craft", this.id, templateList, options)
  }

  getType() {
    return Protocol.definition().BuildingType.AmmoPrinter
  }

  getSpritePath() {
    return "ammo_printer.png"
  }

  getConstantsTable() {
    return "Buildings.AmmoPrinter"
  }

}

module.exports = AmmoPrinter
