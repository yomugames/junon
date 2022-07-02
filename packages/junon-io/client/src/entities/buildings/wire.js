const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Conduit = require("./conduit")

class Wire extends Conduit {

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        line_zero: PIXI.utils.TextureCache["wire_0.png"],
        line_one: PIXI.utils.TextureCache["wire_1.png"],
        line_two: PIXI.utils.TextureCache["wire_2.png"],
        line_two_straight: PIXI.utils.TextureCache["wire_2_straight.png"],
        line_three: PIXI.utils.TextureCache["wire_3.png"],
        line_four: PIXI.utils.TextureCache["wire_4.png"]
      }
    }

    return this.textures
  }

  hasConduitInDirection(directionHits) {
    return directionHits.every((hit) => {
      return hit.entity && hit.entity.hasPowerRole()
    })
  }

  getType() {
    return Protocol.definition().BuildingType.Wire
  }

  getSpritePath() {
    return "wire_0.png"
  }

  getConstantsTable() {
    return "Buildings.Wire"
  }

}

module.exports = Wire
