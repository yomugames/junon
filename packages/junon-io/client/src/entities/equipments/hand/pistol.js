const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Pistol extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()

    this.user.closeHands()
  }

  getSpritePath() {
    return 'pistol.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Pistol
  }

  getConstantsTable() {
    return "Equipments.Pistol"
  }

}

module.exports = Pistol
