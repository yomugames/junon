const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SlimeBroth extends BaseFood {

  getSpritePath() {
    return 'slime_broth_by_px.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SlimeBroth
  }

  getConstantsTable() {
    return "Foods.SlimeBroth"
  }

}

module.exports = SlimeBroth
