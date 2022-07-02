const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Wall = require("./wall")

class Cage extends Wall {

  redrawSprite() {

  }

  getWallColor() {
    return 0xffffff
  }

  getBaseSpritePath() {
    return 'cage_2.png'
  }

  getBuildingSprite() {
    let buildingSprite = super.getBuildingSprite()
    this.baseSprite.width = Constants.tileSize
    this.baseSprite.height = Constants.tileSize
    return buildingSprite
  }

  getType() {
    return Protocol.definition().BuildingType.Cage
  }

  getConstantsTable() {
    return "Buildings.Cage"
  }

}

module.exports = Cage
