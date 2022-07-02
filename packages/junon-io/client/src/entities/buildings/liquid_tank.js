const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")
const LiquidPipe = require("./liquid_pipe")

class LiquidTank extends BaseBuilding {

 onBuildingConstructed() {
    super.onBuildingConstructed()

    this.initDrainable()
  }

  getType() {
    return Protocol.definition().BuildingType.LiquidTank
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["liquid_tank_base.png"])
    this.baseSprite.name = "TankBase"
    this.baseSprite.anchor.set(0.5)

    this.tankRidge = new PIXI.Sprite(PIXI.utils.TextureCache["liquid_tank_ridge.png"])
    this.tankRidge.name = "TankRidge"
    this.tankRidge.anchor.set(0.5)

    this.tankLiquid = new PIXI.Sprite(PIXI.utils.TextureCache["liquid_tank_water.png"])
    this.tankLiquid.name = "TankLiquid"
    this.tankLiquid.anchor.set(0.5)
    this.tankLiquid.width = 0
    this.tankLiquid.height = 0

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.tankLiquid)
    sprite.addChild(this.tankRidge)

    return sprite
  }

  getLiquidMaxWidth() {
    return 55
  }

  getSpritePath() {
    return "liquid_tank.png"
  }

  onUsageChanged() {
    const usageRate = this.getUsage() / this.getUsageCapacity()

    this.tankLiquid.width = usageRate * this.getLiquidMaxWidth()
    this.tankLiquid.height = usageRate * this.getLiquidMaxWidth()
  }

  getConstantsTable() {
    return "Buildings.LiquidTank"
  }

}

module.exports = LiquidTank
