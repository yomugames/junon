const BaseDrink = require("./base_drink")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AlienJuice extends BaseDrink {

  repositionSprite() {
    this.sprite.position.x = 48
    this.sprite.position.y = 30
    this.sprite.rotation = 35 * Math.PI/180
  }

  getSpritePath() {
    return 'alien_juice.png'
  }

  getType() {
    return Protocol.definition().BuildingType.AlienJuice
  }

  getConstantsTable() {
    return "Drinks.AlienJuice"
  }

}

module.exports = AlienJuice
