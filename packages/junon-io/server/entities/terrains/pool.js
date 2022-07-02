const Terrains = require("./index")

class Pool {
  constructor(poolManager, originEntity) {
    this.id = poolManager.game.generateId("pool")

    this.poolManager = poolManager
    this.sector = poolManager.sector
    this.originEntity = originEntity

    this.tiles = {}
    this.firstTile = null

    this.floodFill()

    this.removeSmallPool()
  }

  remove() {
    this.tiles = {}
    this.firstTile = null
  }

  removeSmallPool() {
    if (Object.keys(this.tiles).length <= 1) {
      this.changeTerrainType(Terrains.Rock)
      this.poolManager.removePool(this)
    }
  }

  floodFill() {
    this.poolManager.floodFill(this.originEntity.getRow(), this.originEntity.getCol(), {}, (tile) => {
      if (!this.firstTile) this.firstTile = tile
      this.tiles[this.getTileKey(tile.row, tile.col)] = tile
    })
  }

  getFingerprint() {
    let gridPosition = this.firstTile.row * 300 + this.firstTile.col
    return gridPosition
  }

  changeTerrainType(klass) {
    for (let key in this.tiles) {
      let tile = this.tiles[key]
      tile.entity.remove()
      tile.entity = new klass(this.sector, tile.row, tile.col)
    }
  }

  getTileKey(row, col) {
    return row + "-" + col
  }

  hasTile(row, col) {
    let tileKey = this.getTileKey(row, col)
    return this.tiles[tileKey]
  }

  getId() {
    return this.id
  }

  isWater() {
    return this.firstTile && this.firstTile.entity.isWater()
  }

}

module.exports = Pool
