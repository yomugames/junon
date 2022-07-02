const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class Radio extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 30
  }

  getSpritePath() {
    return 'radio.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Radio
  }

  getConstantsTable() {
    return "Equipments.Radio"
  }

}

module.exports = Radio
