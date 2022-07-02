const BaseTerrain = require("./base_terrain")
const Constants = require("./../../../common/constants")
const Protocol = require("./../../../common/util/protocol")

class Sky extends BaseTerrain {

  isSkyTile() {
    return true
  }

  static isPositionValid(container, x, y, w, h, angle) {
    return true
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

  onStateChanged() {

  }

}

module.exports = Sky
