const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const FuelPipe = require("./fuel_pipe")

class OilRefinery extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    let isBuildingValid = !this.isOnHangar(container, x, y, w, h) &&
                          this.isWithinInteractDistance(x, y, player) &&
                          !container.armorMap.isOccupied(x, y, w, h) &&
                          !container.structureMap.isOccupied(x, y, w, h)

    let checkFull = false
    let excludeOutOfBounds = false
    const hits = container.undergroundMap.hitTestTile(this.getBox(x, y, w, h), checkFull, excludeOutOfBounds)
    const isOnOil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("oil") })
    const isNotOnEmptyTile = !hits.find((hit) => { return hit.entity === null })

    return isBuildingValid && isOnOil && isNotOnEmptyTile
  }


 onBuildingConstructed() {
    super.onBuildingConstructed()

    this.tween = this.getRotatingTween()
    this.tween.start()
  }

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const fadeOutTween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 2000)
        .onUpdate(() => {
          this.rotatorSprite.rotation = rotation.rotation
        })
        .repeat(Infinity)

    return fadeOutTween
  }


  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

  getSpritePath() {
    return 'oil_refinery.png'
  }

  getType() {
    return Protocol.definition().BuildingType.OilRefinery
  }

  getConstantsTable() {
    return "Buildings.OilRefinery"
  }

  getBuildingSprite() {
    const sprite = new PIXI.Container()

    const baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["oil_refinery_base.png"])
    baseSprite.anchor.set(0.5)
    this.baseSprite = baseSprite
    this.baseSprite.name = "BaseSprite"

    let rotator = new PIXI.Sprite(PIXI.utils.TextureCache["oil_refinery_wheel.png"])
    rotator.name = "Rotator"

    rotator.anchor.set(0.5)

    this.rotatorSprite = rotator

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.rotatorSprite)

    return sprite
  }

}

module.exports = OilRefinery
