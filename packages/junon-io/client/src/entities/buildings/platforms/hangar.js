const BaseFloor = require("./base_floor")

const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Hangar extends BaseFloor {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.container.hangars[this.id] = this
  }

  onContentChanged() {
    this.game.emitPlayerPositionChanged()
  }

  unregister() {
    super.unregister()

    this.getContainer().unregisterEntity("hangars", this)
  }

  getTintableSprite() {
    return this.buildingSprite
  }

  getBuildingSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])

    sprite.anchor.set(0.5)
    sprite.scale.y = this.getYScale()
    sprite.scale.x = this.getXScale()
    sprite.width = this.w
    sprite.height = this.h

    return sprite
  }

  redrawNeighborTiles() {
    // dont
  }

  redrawSprite() {
    // dont
  }

  isHangar() {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.Hangar
  }

  getSpritePath() {
    return "hangar_sv.png"
  }

  getConstantsTable() {
    return "Buildings.Hangar"
  }

}

module.exports = Hangar
