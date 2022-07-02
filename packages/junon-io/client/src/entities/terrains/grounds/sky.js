const BaseGround = require("./base_ground")
const Constants = require("../../../../../common/constants")
const Protocol = require("../../../../../common/util/protocol")

class Sky extends BaseGround {

  getSprite() {
    let sprite = super.getSprite()
    sprite.tint = 0x0e1f32
    return sprite
  }

  onBuildingPlaced(row, col) {
  }

  unregister() {
  }

  getType() {
    return Protocol.definition().TerrainType.Sky
  }

  getConstantsTable() {
    return "Terrains.Sky"
  }

  getSpritePath() {
    return 'sky.png'
  }

}

module.exports = Sky
