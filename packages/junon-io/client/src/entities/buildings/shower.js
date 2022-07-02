const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Shower extends BaseBuilding {

  getType() {
    return Protocol.definition().BuildingType.Shower
  }

  getSpritePath() {
    return "shower.png"
  }

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()
    sprite.position.y = -5
    return sprite
  }

  getConstantsTable() {
    return "Buildings.Shower"
  }

}

module.exports = Shower
