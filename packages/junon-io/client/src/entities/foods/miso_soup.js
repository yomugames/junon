const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class MisoSoup extends BaseFood {

  getSpritePath() {
    return 'miso_soup_by_px.png'
  }

  getType() {
    return Protocol.definition().BuildingType.MisoSoup
  }

  getConstantsTable() {
    return "Foods.MisoSoup"
  }

}

module.exports = MisoSoup
