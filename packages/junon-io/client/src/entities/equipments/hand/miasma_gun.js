const RangeEquipment = require("./range_equipment")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class MiasmaGun extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 12
  }

  getInventoryImageStyle() {
    return {
      width: '75%',
      height: '75%',
      transform: 'translate(-50%, -50%) scale(1.3,1.3)'
    }
  }

  getSpritePath() {
    return 'miasma_gun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.MiasmaGun
  }

  getConstantsTable() {
    return "Equipments.MiasmaGun"
  }

}

module.exports = MiasmaGun
