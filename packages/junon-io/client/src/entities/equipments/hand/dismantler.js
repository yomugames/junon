const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Dismantler extends RangeEquipment {

  getSpritePath() {
    return 'dismantler.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Dismantler
  }

  getConstantsTable() {
    return "Equipments.Dismantler"
  }

}

module.exports = Dismantler
