const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class MushroomSoup extends BaseFood {

  getSpritePath() {
    return 'mushroom_soup.png'
  }

  getType() {
    return Protocol.definition().BuildingType.MushroomSoup
  }

  getConstantsTable() {
    return "Foods.MushroomSoup"
  }

}

module.exports = MushroomSoup