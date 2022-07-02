const BaseGround = require("./base_ground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Rock extends BaseGround {

  static getTextureMapping() {
    return {
      line_zero: PIXI.utils.TextureCache["rock_0.png"],
      line_one: PIXI.utils.TextureCache["rock_1.png"],
      line_two: PIXI.utils.TextureCache["rock_2.png"],
      line_two_straight: PIXI.utils.TextureCache["rock_2_straight.png"],
      line_three: PIXI.utils.TextureCache["rock_3.png"],
      line_four: PIXI.utils.TextureCache["rock_4.png"]
    }
  }

  getSideHitTileMaps() {
    return [this.game.sector.map, this.game.sector.groundMap]
  }

  getSpritePath() {
    return 'rock_2.png'
  }

  getType() {
    return Protocol.definition().TerrainType.Rock
  }

  getConstantsTable() {
    return "Terrains.Rock"
  }

  // getShadowColor() {
  //   let neighbors = this.game.sector.lightManager.getLightNeighbors({ row: this.getRow(), col: this.getCol() })
  //   let isBesideSkyOrWater = neighbors.find((neighbor) => { 
  //     return !neighbor.entity || (neighbor.entity && neighbor.entity.isUndergroundTile())
  //   })

  //   if (isBesideSkyOrWater) {
  //     return "#ffffff" // no shadows
  //   } else {
  //     return "#111111" // completely hidden by default
  //   }
  // }


}

module.exports = Rock
