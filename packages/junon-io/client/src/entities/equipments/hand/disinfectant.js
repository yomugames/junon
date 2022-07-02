const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class Disinfectant extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 30
  }

  getSpritePath() {
    return 'disinfectant.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Disinfectant
  }

  getConstantsTable() {
    return "Equipments.Disinfectant"
  }

}

module.exports = Disinfectant
