const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class FirstAidKit extends BaseFood {

  repositionSprite() {
    this.sprite.position.x = 50
    this.sprite.position.y = 20
  }

  getSpritePath() {
    return 'first_aid_kit.png'
  }

  getType() {
    return Protocol.definition().BuildingType.FirstAidKit
  }

  getConstantsTable() {
    return "Foods.FirstAidKit"
  }

}

module.exports = FirstAidKit
