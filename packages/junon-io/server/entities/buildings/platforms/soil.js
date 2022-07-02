const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class Soil extends BaseFloor {

  getConstantsTable() {
    return "Floors.Soil"
  }

  getType() {
    return Protocol.definition().BuildingType.Soil
  }

  isUnplanted() {
    let seed = this.getSeed()
    if (!seed) return true
    return !seed.hasCategory("seed")
  }

  isUnwatered() {
    let seed = this.getSeed()
    if (!seed) return false
    return !seed.isWatered
  }

  getSeed() {
    let seed = this.getContainer().distributionMap.get(this.getRow(), this.getCol())
    return seed || null // if value is 0, return null
  }

  static isPositionValid(container, x, y, w, h, angle, player, type) {
    let isBuildingValid = super.isPositionValid(container, x, y, w, h, angle, player, type)
    let row = Math.floor( y / Constants.tileSize)
    let col = Math.floor( x / Constants.tileSize)

    const structure = container.structureMap.get(row, col)
    if (structure) return false

    const wall = container.armorMap.get(row, col)
    if (wall) return false

    return isBuildingValid 
  }

}

module.exports = Soil
