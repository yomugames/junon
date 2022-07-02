const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ShipyardConstructor extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = this.game.getShipBuildings()
    this.game.craftMenu.open("ShipyardConstructor", "Cook", this.id, templateList)
  }


  getType() {
    return Protocol.definition().BuildingType.ShipyardConstructor
  }

  getSpritePath() {
    return "shipyard_constructor.png"
  }

  getConstantsTable() {
    return "Buildings.ShipyardConstructor"
  }

}

module.exports = ShipyardConstructor
