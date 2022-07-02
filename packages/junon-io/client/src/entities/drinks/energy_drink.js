const BaseDrink = require("./base_drink")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class EnergyDrink extends BaseDrink {

  repositionSprite() {
    this.sprite.position.x = 48
    this.sprite.position.y = 30
    this.sprite.rotation = 35 * Math.PI/180
  }

  getSpritePath() {
    return 'energy_drink.png'
  }

  getType() {
    return Protocol.definition().BuildingType.EnergyDrink
  }

  getConstantsTable() {
    return "Drinks.EnergyDrink"
  }

}

module.exports = EnergyDrink
