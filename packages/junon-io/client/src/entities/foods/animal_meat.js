const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AnimalMeat extends RawFood {

  getSpritePath() {
    return 'animal_meat.png'
  }

  getType() {
    return Protocol.definition().BuildingType.AnimalMeat
  }

  getConstantsTable() {
    return "Foods.AnimalMeat"
  }

}

module.exports = AnimalMeat
