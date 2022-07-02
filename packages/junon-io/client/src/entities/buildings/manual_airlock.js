const Airlock = require("./airlock")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ManualAirlock extends Airlock {
  getConstantsTable() {
    return "Buildings.ManualAirlock"
  }

  layoutTiles() {
    // not a power conductor, dont
  }

  redrawNeighborTiles() {
    // not a power conductor, dont
  }

  getType() {
    return Protocol.definition().BuildingType.ManualAirlock
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    let texture = PIXI.utils.TextureCache["upper_door.png"]
    this.upperDoorSprite = new PIXI.Sprite(texture)
    this.upperDoorSprite.anchor.set(0.5)
    this.upperDoorSprite.name = "UpperDoor"

    texture = PIXI.utils.TextureCache["lower_door.png"]
    this.lowerDoorSprite = new PIXI.Sprite(texture)
    this.lowerDoorSprite.anchor.set(0.5)
    this.lowerDoorSprite.name = "LowerDoor"

    sprite.addChild(this.lowerDoorSprite)
    sprite.addChild(this.upperDoorSprite)

    return sprite
  }

  getSpritePath() {
    return "lower_door.png"
  }



}

module.exports = ManualAirlock
