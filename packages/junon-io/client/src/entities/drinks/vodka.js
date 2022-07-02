const BaseDrink = require("./base_drink")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Vodka extends BaseDrink {

  repositionSprite() {
    this.sprite.position.x = 48
    this.sprite.position.y = 30
    this.sprite.rotation = 35 * Math.PI/180
  }

  getType() {
    return Protocol.definition().BuildingType.Vodka
  }

  getConstantsTable() {
    return "Drinks.Vodka"
  }

}

module.exports = Vodka
