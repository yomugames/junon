const BaseKnife = require("./base_knife")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Kukri extends BaseKnife {
  repositionSprite() {
    super.repositionSprite()
    
    this.sprite.position.x += 8
    this.sprite.position.y -= 1
    
    this.sprite.rotation = 45 * PIXI.DEG_TO_RAD
    
    this.sprite.scale.y = -1
  }

  getSpritePath() {
    return 'kukri.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Kukri
  }

  getConstantsTable() {
    return "Equipments.Kukri"
  }

}

module.exports = Kukri