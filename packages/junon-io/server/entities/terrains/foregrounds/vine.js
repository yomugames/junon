const BaseForeground = require("./base_foreground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Vine extends BaseForeground {
  getType() {
    return Protocol.definition().TerrainType.Vine
  }

  getConstantsTable() {
    return "Terrains.Vine"
  }

  getDropType() {
    return Protocol.definition().BuildingType.PlantFiber
  }

  onBuildingPlaced(row, col) {
    super.onBuildingPlaced(row, col)

    this.sector.plants[this.getId()] = this
  }

  unregister() {
    super.unregister()

    delete this.sector.plants[this.getId()]
  }


}

module.exports = Vine
