const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class RocketLauncher extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    // this.sprite.position.x 
  }

  getSpritePath() {
    return 'rocket_launcher.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RocketLauncher
  }

  getConstantsTable() {
    return "Equipments.RocketLauncher"
  }

}

module.exports = RocketLauncher
