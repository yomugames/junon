const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const WaterPumpCommon = require('../../../common/entities/water_pump_common')
const BaseBuilding = require("./base_building")

class WaterPump extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()
    this.container.addProcessor(this)
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    let liquidNetwork = this.getLiquidNetwork()
    if (liquidNetwork) {
      liquidNetwork.fillResource(this)
    }
  }

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let square = WaterPumpCommon.getSquare(x, y, angle)

    return container.platformMap.isFullyOccupied(square.x, square.y, square.w, square.h) ||
           container.groundMap.isFullyOccupied(square.x, square.y, square.w, square.h)
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let isBuildingValid = super.isPositionValid(container, x, y, w, h, angle, player)
    let extractor = WaterPumpCommon.getExtractor(x, y, angle)

    let box = this.getBox(extractor.x, extractor.y, extractor.w, extractor.h)

    let hasWater = container.groundMap.hitTestTile(box).every((hit) => {
      return hit.entity && hit.entity.getType() === Protocol.definition().TerrainType.Water
    })

    return isBuildingValid && hasWater
  }

  getConstantsTable() {
    return "Buildings.WaterPump"
  }

  getType() {
    return Protocol.definition().BuildingType.WaterPump
  }

}

module.exports = WaterPump

