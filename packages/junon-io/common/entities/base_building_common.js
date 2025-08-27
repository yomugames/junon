const Protocol = require('./../util/protocol')

const BaseBuildingCommon = () => {
}

BaseBuildingCommon.prototype = {

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  },

  isStructure() {
    return !this.hasCategory("terrain") && !this.hasCategory("platform") && !this.hasCategory("distribution")
  },

  // account for structures only
  isOccupied() {
    let x
    let y

    if (this.getContainer().isMovable()) {
      x = this.getRelativeX()
      y = this.getRelativeY()
    } else {
      x = this.getX()
      y = this.getY()
    }

    const w = this.getWidth()
    const h = this.getHeight()

    return this.getContainer().armorMap.isOccupied(x, y, w, h) ||
           this.getContainer().structureMap.isOccupied(x, y, w, h)
  },

  isTrap() {
    return this.hasCategory("trap")
  },

  isDistribution() {
    return this.hasCategory("distribution")
  },

  isStructureConduit() {
    if (this.hasCategory("not_structure_conduit")) return false
      
    // a structure that's also a conduit (i.e electrical door, tanks)
    return this.hasCategory("power_consumer") || this.hasCategory("power_producer")  ||
           this.hasCategory("power_storage")  || this.hasCategory("oxygen_producer") ||
           this.hasCategory("oxygen_storage") || this.hasCategory("liquid_producer") ||
           this.hasCategory("liquid_storage") || this.hasCategory("fuel_producer")   ||
           this.hasCategory("fuel_storage")   || this.hasCategory("structure_conduit")
  },


  isGroundTile() {
    return false
  },

  isForegroundTile() {
    return false
  },

  isUndergroundTile() {
    return false
  },

  setRemoved() {
    this.isRemoved = true
  },

  drainSample() {
    if (this.hasEffect('blood')) {
      this.setEffectLevel('blood', this.getEffectLevel('blood') - 1)
      return "Blood"
    }
  },

  isPathFindable() {
    return true
  },

  isPathFindBlocker() {
    if (this.hasCategory("trap")) return false
    if (this.hasCategory("walkable")) return false
    return this.isStructure() || this.hasCategory("wall")
  },

  isRoomPartitioner() {
    return this.hasCategory("door") || 
           this.hasCategory("vent") ||
           this.hasCategory("wall") ||
           this.hasCategory("escape_pod") 
  },

  hasRoomRole() {
    return this.isRoomPartitioner() || 
           this.hasCategory("platform") || 
           this.hasCategory("air_detector") || 
           this.hasCategory("oxygen_storage") ||
           this.isStructure()
  },


  hasOxygenRole() {
    return this.hasCategory("oxygen_conduit") ||
           this.hasCategory("oxygen_producer") ||
           this.hasCategory("oxygen_storage") ||
           this.hasCategory("vent")
  },

  hasPowerRole() {
    return this.hasCategory("power_conduit")  ||
           this.hasCategory("power_producer") ||
           this.hasCategory("power_storage")  ||
           this.hasCategory("power_consumer")
  },

  hasLiquidRole() {
    return this.hasCategory("liquid_conduit")  ||
           this.hasCategory("liquid_producer") ||
           this.hasCategory("liquid_storage")  ||
           this.hasCategory("liquid_consumer")
  },

  hasRailRole() {
    return this.hasCategory("rail")
  },

  hasSoilRole() {
    return this.hasCategory("soil") || this.hasCategory("farm_controller")
  },

  hasFuelRole() {
    return this.hasCategory("fuel_conduit")  ||
           this.hasCategory("fuel_producer") ||
           this.hasCategory("fuel_storage")  ||
           this.hasCategory("fuel_consumer")
  },

  hasDistributionRole() {
    return this.hasPowerRole() || this.hasOxygenRole() || this.hasLiquidRole() || this.hasFuelRole()
  },

  getLand() {
    return this.sector.getLand(this.getRow(), this.getCol())
  },

  getRoom() {
    return this.room
  },

  getRooms() {
    return this.rooms
  },

  getOccupiedRoom() {
    let platform = this.getStandingPlatform()
    if (!platform) return null

    return platform.getRoom()
  },

  getResourceConsumption(name) {
    let field = name + "Consumption"
    return this.getStats(this.level)[field]
  },

  getResourceCapacity(name) {
    let field = name + "Capacity"
    return this.getStats(this.level)[field]
  },

  getResourceProduction(name) {
    let field = name + "Production"
    return this.getStats(this.level)[field]
  },

  isAirtight() {
    return !!this.getConstants().isAirtight
  },

  hasObstacleOnTop() {
    let row = this.getRow()
    let col = this.getCol()
    let entity = this.getContainer().structureMap.get(row, col)
    if (entity && 
        entity.isConstructionFinished() &&
        !entity.isPassableByPathFinder()) {
      return true
    }

    entity = this.getContainer().armorMap.get(row, col)
    if (entity && entity.isConstructionFinished()) return true

    return false
  }

}

module.exports = BaseBuildingCommon

