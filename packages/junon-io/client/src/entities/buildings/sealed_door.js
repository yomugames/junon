const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Airlock = require("./airlock")

class SealedDoor extends Airlock {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.SealedDoor
  }

  shouldShowCustomAccessSelect() {
    return false
  }

  getSpritePath() {
    return "sealed_door.png"
  }

  getConstantsTable() {
    return "Buildings.SealedDoor"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    let texture = PIXI.utils.TextureCache["sealed_door_upper.png"]
    this.upperDoorSprite = new PIXI.Sprite(texture)
    this.upperDoorSprite.anchor.set(0.5)
    this.upperDoorSprite.name = "UpperDoor"

    texture = PIXI.utils.TextureCache["sealed_door_lower.png"]
    this.lowerDoorSprite = new PIXI.Sprite(texture)
    this.lowerDoorSprite.anchor.set(0.5)
    this.lowerDoorSprite.name = "LowerDoor"

    sprite.addChild(this.lowerDoorSprite)
    sprite.addChild(this.upperDoorSprite)

    return sprite
  }

}

module.exports = SealedDoor
