const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Conduit = require("./conduit")

class LiquidPipe extends Conduit {
  static isPositionValid(container, x, y, w, h, angle, player) {
    return !this.isOnHangar(container, x, y, w, h) &&
           this.isWithinInteractDistance(x, y, player) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container[this.prototype.getTileMapName()].isOccupied(x, y, w, h)
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        line_zero: PIXI.utils.TextureCache["water_pipe_1.png"],
        line_one: PIXI.utils.TextureCache["water_pipe_1.png"],
        line_two: PIXI.utils.TextureCache["water_pipe_2.png"],
        line_two_straight: PIXI.utils.TextureCache["water_pipe_2_straight.png"],
        line_three: PIXI.utils.TextureCache["water_pipe_3.png"],
        line_four: PIXI.utils.TextureCache["water_pipe_4.png"]
      }
    }

    return this.textures
  }

  getTileMapName() {
    return "liquidDistributionMap"
  }

  getSpriteLayerGroup() {
    return "liquidDistributions"
  }

  hasConduitInDirection(directionHits) {
    return directionHits.every((hit) => {
      return hit.entity && hit.entity.hasLiquidRole()
    })
  }

  getType() {
    return Protocol.definition().BuildingType.LiquidPipe
  }

  getSpritePath() {
    return "water_pipe_1.png"
  }

  getConstantsTable() {
    return "Buildings.LiquidPipe"
  }

}

module.exports = LiquidPipe

