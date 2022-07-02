const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const LiquidTank = require("./liquid_tank")

class CryoTube extends LiquidTank {

 onBuildingConstructed() {
    super.onBuildingConstructed()
  }

  setUsage(usage) {
    this.usage = usage
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["cryo_tube_base.png"])
    this.baseSprite.name = "TankBase"
    this.baseSprite.anchor.set(0.5)
    this.baseSprite.position.x = -11

    this.tankCover = new PIXI.Sprite(PIXI.utils.TextureCache["cryo_tube_cover.png"])
    this.tankCover.name = "TankCover"
    this.tankCover.anchor.set(0.5)
    this.tankCover.alpha = 0.7

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.tankCover)

    return sprite
  }

  getSpritePath() {
    return "cryo_tube.png"
  }

  getConstantsTable() {
    return "Buildings.CryoTube"
  }

  getType() {
    return Protocol.definition().BuildingType.CryoTube
  }


}

module.exports = CryoTube
