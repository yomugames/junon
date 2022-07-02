const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class FireExtinguisher extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 30
  }

  getSpritePath() {
    return 'fire_extinguisher.png'
  }

  getType() {
    return Protocol.definition().BuildingType.FireExtinguisher
  }

  getConstantsTable() {
    return "Equipments.FireExtinguisher"
  }

}

module.exports = FireExtinguisher
