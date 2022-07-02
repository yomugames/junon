const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Gelatin extends BaseFood {

  repositionSprite() {
    this.sprite.rotation = Math.PI/2
    this.sprite.position.x = 50
    this.sprite.position.y = 20
    this.sprite.width = 25
    this.sprite.height = 20
  }

  getSpritePath() {
    return 'gelatin.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Gelatin
  }

  getConstantsTable() {
    return "Foods.Gelatin"
  }

}

module.exports = Gelatin
