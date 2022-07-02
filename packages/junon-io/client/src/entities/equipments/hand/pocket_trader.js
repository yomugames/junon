const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const ClientHelper = require("./../../../util/client_helper")


class PocketTrader extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 30
  }

  getSpritePath() {
    return 'pocket_trader.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PocketTrader
  }

  getConstantsTable() {
    return "Equipments.PocketTrader"
  }

}

module.exports = PocketTrader
