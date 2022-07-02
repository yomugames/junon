const BaseUnit = require("./base_unit")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Fighter extends BaseUnit {
  getSpritePath() {
    return 'mini_fighter.png'
  }

  getConstantsTable() {
    return "Buildings.Fighter"
  }

  getType() {
    return Protocol.definition().BuildingType.Fighter
  }
}

module.exports = Fighter
