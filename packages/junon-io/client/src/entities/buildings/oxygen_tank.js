const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")
const GasPipe = require("./gas_pipe")

class OxygenTank extends BaseBuilding {

  getType() {
    return Protocol.definition().BuildingType.OxygenTank
  }

  getSpritePath() {
    return "oxygen_tank.png"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    this.baseSprite.name = "BaseSprite"
    this.baseSprite.anchor.set(0.5)
    this.baseSprite.width = this.getWidth()
    this.baseSprite.height = this.getHeight()

    sprite.addChild(this.baseSprite)

    return sprite
  }


  getConstantsTable() {
    return "Buildings.OxygenTank"
  }

  getOxygenMaxWidth() {
    return 36
  }

}

module.exports = OxygenTank
