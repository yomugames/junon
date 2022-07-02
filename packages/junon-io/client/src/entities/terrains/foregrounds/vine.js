const BaseForeground = require("./base_foreground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Vine extends BaseForeground {

  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.sector.plants[this.id] = this
  }

  unregister() {
    super.unregister()

    delete this.sector.plants[this.id] 
  }
  
  getType() {
    return Protocol.definition().TerrainType.Vine
  }

  getConstantsTable() {
    return "Terrains.Vine"
  }

  getSpritePath() {
    return "vine.png"
  }

  isPlant() {
    return true  
  }

}

module.exports = Vine
