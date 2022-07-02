const BaseFloor = require("./base_floor")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")


class Floor extends BaseFloor {

  getBaseSpritePath() {
    if (this.data && this.data.textureIndex) {
      let textureName = this.game.floorTextures[this.data.textureIndex]
      return textureName
    }

    return 'solid_texture.png'
  }

  getOverlayTexturePath() {
    return 'bevelled_texture.png'
  }

  getEdgeSpritePath() {
    return 'platform_edge.png'
  }

  hasEdgeSprite() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.Floor
  }

  getConstantsTable() {
    return "Floors.Floor"
  }

}

module.exports = Floor
