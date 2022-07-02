const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")

class OxygenGenerator extends BaseBuilding {

  getType() {
    return Protocol.definition().BuildingType.OxygenGenerator
  }

  getSpritePath() {
    return "oxygen_generator.png"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    this.baseSprite.name = "BaseSprite"
    this.baseSprite.anchor.set(0.5)
    // this.baseSprite.width = this.getWidth()
    // this.baseSprite.height = this.getHeight()

    sprite.addChild(this.baseSprite)

    return sprite
  }

  getOxygenMaxWidth() {
    return 36
  }

  getConstantsTable() {
    return "Buildings.OxygenGenerator"
  }

}

module.exports = OxygenGenerator
