const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class FarmController extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.getPlacer() && this.getPlacer().isPlayer()) {
      this.getPlacer().walkthroughManager.handle("farm_controller")
    }
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let isBuildingValid = super.isPositionValid(container, x, y, w, h, angle, player)

    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    const neighborsHit = container.platformMap.getNeighbors(row, col)
    let hasFarmController = neighborsHit.find((hit) => {
      return hit.entity.soilNetwork && hit.entity.soilNetwork.getFarmController()
    })

    if (hasFarmController) {
      player.showError("An farm controller already exist for this soil")
      return false
    }

    return isBuildingValid
  }

  getConstantsTable() {
    return "Buildings.FarmController"
  }

  getType() {
    return Protocol.definition().BuildingType.FarmController
  }

  hasCropTarget() {
    return this.content
  }

  getSeedType() {
    if (!this.content) return null
      
    return parseInt(this.content)
  }

  setBuildingContent(content, player) {
    let isAllowedSeed = this.getAllowedSeedTypes().indexOf(parseInt(content)) !== -1
    if (!isAllowedSeed) return

    if (this.content !== content) {
      this.content = content
      this.onBuildingContentChanged()
    }

    if (player) {
      player.walkthroughManager.handle("select_wheat", { content: content })
    }
  }

  getAllowedSeedTypes() {
    let typeNames = Object.keys(Constants.Crops).filter((name) => {
      return name !== 'BaseSeed'
    })

    return typeNames.map((typeName) => {
      return Protocol.definition().BuildingType[typeName]
    })
  }

}

module.exports = FarmController
