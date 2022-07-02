const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Shotgun extends RangeEquipment {

  getSpritePath() {
    return 'shotgun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Shotgun
  }

  getConstantsTable() {
    return "Equipments.Shotgun"
  }

}

module.exports = Shotgun
