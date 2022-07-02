const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PotatoSoup extends BaseFood {

  getSpritePath() {
    return 'potato_soup_by_px.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PotatoSoup
  }

  getConstantsTable() {
    return "Foods.PotatoSoup"
  }

}

module.exports = PotatoSoup
