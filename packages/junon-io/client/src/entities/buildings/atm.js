const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseBuilding = require("./base_building")

class Atm extends BaseBuilding {

  getSpritePath() {
    return "atm.png"
  }

  openMenu() {
    this.game.atmMenu.open({ entity: this })
  }

  getType() {
    return Protocol.definition().BuildingType.Atm
  }

  getConstantsTable() {
    return "Buildings.Atm"
  }

}

module.exports = Atm
