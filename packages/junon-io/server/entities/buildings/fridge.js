const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Fridge extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Fridge"
  }

  getType() {
    return Protocol.definition().BuildingType.Fridge
  }

  canStoreInBuilding(index, item) {
    if (!item) return true // allow swap with blank space slot
    
    return item.isFood() || item.isDrink()
  }


}

module.exports = Fridge

