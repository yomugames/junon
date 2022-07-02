const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PlasmaGun extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 8

    // this.sprite.position.x 
  }

  getSpritePath() {
    return 'plasma_gun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaGun
  }

  getConstantsTable() {
    return "Equipments.PlasmaGun"
  }

}

module.exports = PlasmaGun
