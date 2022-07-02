const Lamp = require("./lamp")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class WallLamp extends Lamp {

  createSprite() {
    return new PIXI.Sprite(PIXI.utils.TextureCache["wall_lamp_sprite.png"])
  }

  getType() {
    return Protocol.definition().BuildingType.WallLamp
  }

  getSpritePath() {
    return "wall_lamp.png"
  }

  getConstantsTable() {
    return "Buildings.WallLamp"
  }

}

module.exports = WallLamp
