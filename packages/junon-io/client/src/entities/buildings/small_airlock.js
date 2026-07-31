const Airlock = require("./airlock")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SmallAirlock extends Airlock {

  getConstantsTable() {
    return "Buildings.SmallAirlock"
  }

  open() {
    this.tween = super.getOpenTween(Constants.tileSize * 1.5)
    this.tween.start()
  }

  getType() {
    return Protocol.definition().BuildingType.SmallAirlock
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    let texture = PIXI.utils.TextureCache["small_airlock_upper.png"]
    this.upperDoorSprite = new PIXI.Sprite(texture)
    this.upperDoorSprite.anchor.set(0.5)
    this.upperDoorSprite.name = "UpperDoor"

    texture = PIXI.utils.TextureCache["small_airlock_lower.png"]
    this.lowerDoorSprite = new PIXI.Sprite(texture)
    this.lowerDoorSprite.anchor.set(0.5)
    this.lowerDoorSprite.name = "LowerDoor"

    sprite.addChild(this.lowerDoorSprite)
    sprite.addChild(this.upperDoorSprite)

    return sprite
  }

  getSpritePath() {
    return "small_airlock.png"
  }



}

module.exports = SmallAirlock
