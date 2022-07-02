const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class IonCannon extends BaseTower {
  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getBarrelSpritePath() {
    return 'ion_cannon.png'
  }

  getBaseSpritePath() {
    return ''
  }

  getConstantsTable() {
    return "Buildings.IonCannon"
  }

  getType() {
    return Protocol.definition().BuildingType.IonCannon
  }

}

module.exports = IonCannon
