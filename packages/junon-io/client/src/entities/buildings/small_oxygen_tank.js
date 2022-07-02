const OxygenTank = require("./oxygen_tank")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SmallOxygenTank extends OxygenTank {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getWidth() {
    return 32
  }

  getHeight() {
    return 32
  }

  getSprite() {
    let sprite = super.getSprite()

    this.fillBarContainer.position.x = -22

    return sprite
  }


  getType() {
    return Protocol.definition().BuildingType.SmallOxygenTank
  }

  getSpritePath() {
    return "oxygen_tank.png"
  }

  getConstantsTable() {
    return "Buildings.SmallOxygenTank"
  }

}

module.exports = SmallOxygenTank
