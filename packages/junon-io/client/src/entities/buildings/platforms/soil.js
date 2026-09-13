const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class Soil extends BaseFloor {

  getBaseSpritePath() {
    return 'soil.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Soil
  }

  getConstantsTable() {
    return "Floors.Soil"
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()

    const seed = this.getContainer().distributionMap.get(this.getRow(), this.getCol())
    if (seed && seed.isWatered) {
      this.applyTint(0x999999)
      this.updateChunkSprite()
    }
  }

}

module.exports = Soil
