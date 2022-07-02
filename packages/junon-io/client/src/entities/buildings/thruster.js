const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Trail = require("./../particles/trail")

class Thruster extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    if (!this.isEquipDisplay && this.container.isMovable()) {
      this.container.addThruster(this)
    }
  }

  remove() {
    if (!this.isEquipDisplay && this.container.isMovable()) {
      this.container.removeThruster(this)
    }
    super.remove()
  }

  addTrail() {
    Trail.create({ 
      x: this.getX(), 
      y: this.getY(), 
      angle: this.getRotatedAngle(), 
      color: 0x86e7ff, 
      radius: 20, 
      offset: 96
    })
  }

  getSpritePath() {
    return this.getBaseSpritePath()
  }

  getBaseSpritePath() {
    return "thruster_small.png"
  }

  getRotatorSpritePath() {
    return ""
  }

  getDisplayWidth() {
    return 48
  }

  getDisplayHeight() {
    return 48
  }

  getBuildingSprite() {
    const sprite = new PIXI.Container()

    const baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBaseSpritePath()])
    baseSprite.anchor.x = 0.75
    baseSprite.anchor.y = 0.5
    baseSprite.width  = this.getDisplayWidth()
    baseSprite.height = this.getDisplayHeight()

    this.baseSprite = baseSprite

    sprite.addChild(baseSprite)

    return sprite
  }

  getTintableSprite() {
    return this.baseSprite
  }


  getType() {
    return Protocol.definition().BuildingType.Thruster
  }

  getConstantsTable() {
    return "Buildings.Thruster"
  }

}

module.exports = Thruster
