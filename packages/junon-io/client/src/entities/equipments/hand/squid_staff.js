const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class SquidStaff extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    // this.sprite.position.x 
  }

  getSpritePath() {
    return 'squid_staff.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SquidStaff
  }

  getConstantsTable() {
    return "Equipments.SquidStaff"
  }

}

module.exports = SquidStaff
