const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const Tilable = require("./../../../../../common/interfaces/tilable")
const BaseFloor = require("./base_floor")

class CarpetFloor extends BaseFloor {

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        line_zero: PIXI.utils.TextureCache["carpet_0.png"],
        line_one: PIXI.utils.TextureCache["carpet_1.png"],
        line_two: PIXI.utils.TextureCache["carpet_2.png"],
        line_two_straight: PIXI.utils.TextureCache["carpet_2_straight.png"],
        line_three: PIXI.utils.TextureCache["carpet_3.png"],
        line_four: PIXI.utils.TextureCache["carpet_4.png"]
      }
    }

    return this.textures
  }

  getBaseSpritePath() {
    return 'red_carpet.png'
  }

  getSideHitTileMaps() {
    return [this.container.platformMap]
  }

  getType() {
    return Protocol.definition().BuildingType.CarpetFloor
  }

  getConstantsTable() {
    return "Floors.CarpetFloor"
  }

  redrawSprite() {
    let tiles = this.convertNeighborsToSideHits(this.neighbors)
    for (let direction in tiles) {
      if (!tiles[direction]) {
        delete tiles[direction]
      }
    }

    this.layoutTile(tiles)

    super.redrawSprite()
  }

}

Object.assign(CarpetFloor.prototype, Tilable.prototype, {
  getTextures() {
    return this.constructor.getTextures()
  },
  getTileSprite() {
    return this.baseSprite
  }
})


module.exports = CarpetFloor
