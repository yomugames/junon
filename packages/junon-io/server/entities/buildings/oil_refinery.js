const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class OilRefinery extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let isBuildingValid = !this.isOnHangar(container, x, y, w, h) &&
                          !container.armorMap.isOccupied(x, y, w, h) &&
                          !container.structureMap.isOccupied(x, y, w, h)

    let checkFull = false
    let excludeOutOfBounds = false
    const hits = container.groundMap.hitTestTile(this.getBox(x, y, w, h), checkFull, excludeOutOfBounds)
    const isOnOil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("oil") })
    const isNotOnEmptyTile = !hits.find((hit) => { return hit.entity === null })

    return isBuildingValid && isOnOil && isNotOnEmptyTile
  }


  onConstructionFinished() {
    super.onConstructionFinished()
    this.container.addProcessor(this)
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  executeTurn() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 3) === 0
    if (!isThreeSecondInterval) return

    let fuelNetwork = this.getFuelNetwork()
    if (fuelNetwork) {
      fuelNetwork.fillResource(this)
    }
  }

  getConstantsTable() {
    return "Buildings.OilRefinery"
  }

  getType() {
    return Protocol.definition().BuildingType.OilRefinery
  }

}

module.exports = OilRefinery
