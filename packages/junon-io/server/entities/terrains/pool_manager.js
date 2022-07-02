const Pool = require("./pool")
const FloodFillManager = require("./../../../common/entities/flood_fill_manager")

class PoolManager {
  constructor(sector) {
    this.sector = sector
    this.game = sector.game
    this.pools = {}

    this.initFloodFillManager()
  }

  initFloodFillManager() {
    this.floodFillManager = new FloodFillManager(this, { name: "pool_manager", container: this.sector, includeDiagonals: true, queue: this.sector.floodFillQueue.getQueue() })
    this.floodFillManager.setGrids([this.sector.groundMap])
    this.floodFillManager.setStopIdentifier(this.shouldStopFloodFill.bind(this))
  }

  cleanup() {
    for (let id in this.pools) {
      let pool = this.pools[id]
      pool.remove()
    }

    this.pools = {}
  }

  shouldStopFloodFill(hit, neighbors, originHit, sourceEntity) {
    if (!hit.entity) return true

    return !hit.entity.isUndergroundTile() 
  }

  floodFill(row, col, options, callback) {
    return this.floodFillManager.floodFill(row, col, options, callback)
  }

  findOrCreatePool(tile) {
    let pool = this.getPool(tile.getRow(), tile.getCol())
    
    if (!pool) {
      pool = this.createPool(tile)
    }

    return pool
  }

  getWaterPool() {
    let result

    for (let id in this.pools) {
      let pool = this.pools[id]
      if (pool.isWater()) {
        result = pool
        break
      }
    }

    return result
  }

  createPool(tile) {
    let pool = new Pool(this, tile)
    this.pools[pool.getId()] = pool
    return pool
  }

  removePool(pool) {
    delete this.pools[pool.getId()]
  }

  getPool(row, col) {
    return Object.values(this.pools).find((pool) => {
      return pool.hasTile(row, col)
    })
  }

}

module.exports = PoolManager