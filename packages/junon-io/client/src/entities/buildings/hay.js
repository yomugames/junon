const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Hay extends BaseBuilding {
  getType() {
    return Protocol.definition().BuildingType.Hay
  }

  getSpritePath() {
    return "hay.png"
  }

  getConstantsTable() {
    return "Buildings.Hay"
  }

}

module.exports = Hay
