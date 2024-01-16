const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PumpkinPie extends BaseFood {

  getSpritePath() {
    return 'pumpkin_pie.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PumpkinPie
  }

  getConstantsTable() {
    return "Foods.PumpkinPie"
  }

}

module.exports = PumpkinPie