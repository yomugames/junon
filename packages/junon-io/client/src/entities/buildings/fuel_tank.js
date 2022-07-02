const LiquidTank = require("./liquid_tank")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")
const FuelPipe = require("./fuel_pipe")

class FuelTank extends LiquidTank {

 onBuildingConstructed() {
    super.onBuildingConstructed()

    this.initDrainable()
  }

  getType() {
    return Protocol.definition().BuildingType.FuelTank
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["fuel_tank.png"])
    this.baseSprite.name = "TankBase"
    this.baseSprite.anchor.set(0.5)

    sprite.addChild(this.baseSprite)

    return sprite
  }

  onUsageChanged() {
    this.redrawEntityUsage()
  }

  getLiquidMaxWidth() {
    return 55
  }

  getSpritePath() {
    return "fuel_tank.png"
  }

  getConstantsTable() {
    return "Buildings.FuelTank"
  }

}

module.exports = FuelTank
