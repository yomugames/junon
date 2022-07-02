
const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Scar17 extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 20
  }

  getSpritePath() {
    return 'scar_17_by_px.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Scar17
  }

  getConstantsTable() {
    return "Equipments.Scar17"
  }

}

module.exports = Scar17
