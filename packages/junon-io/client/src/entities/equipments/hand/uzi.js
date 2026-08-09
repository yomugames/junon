const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Uzi extends RangeEquipment {

  getSpritePath() {
    return 'uzi.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Uzi
  }

  getConstantsTable() {
    return "Equipments.Uzi"
  }

}

module.exports = Uzi
