const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class FlameThrower extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 30
  }

  getSpritePath() {
    return 'flame_thrower.png'
  }

  getType() {
    return Protocol.definition().BuildingType.FlameThrower
  }

  getConstantsTable() {
    return "Equipments.FlameThrower"
  }

}

module.exports = FlameThrower
