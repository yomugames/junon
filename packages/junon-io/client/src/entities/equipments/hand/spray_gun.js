const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")

class SprayGun extends RangeEquipment {

  getSpritePath() {
    return 'spray_gun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SprayGun
  }

  getConstantsTable() {
    return "Equipments.SprayGun"
  }

}

module.exports = SprayGun