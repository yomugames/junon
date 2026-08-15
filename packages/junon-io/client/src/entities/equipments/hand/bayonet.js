const BaseKnife = require("./base_knife")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Bayonet extends BaseKnife {
  repositionSprite() {
    super.repositionSprite()
    
    this.sprite.position.x = 22
  }
  
  getSpritePath() {
    return 'bayonet.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Bayonet
  }

  getConstantsTable() {
    return "Equipments.Bayonet"
  }

}

module.exports = Bayonet