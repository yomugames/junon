const BaseTerrain = require("./../base_terrain")
const Destroyable = require('../../../../common/interfaces/destroyable')
const SocketUtil = require("junon-common/socket_util")

class BaseForeground extends BaseTerrain {

  constructor(sector, row, col) {
    super(sector, row, col)

    this.initDestroyable()

    this.updatePathFinder()
  }

  isMineable() {
    return true
  }

  isCollidable() {
    return true
  }

  shouldCollideEdge() {
    return true
  }

  remove(options = {}) {
    super.remove(options)

    if (!options.removeAll) {
      this.createRock()
    }
  }

  createRock() {
    this.sector.createRock(this.row, this.col)
  }

  updatePathFinder() {
    let pathFinder = this.sector.pathFinder
    if (pathFinder) {
      let chunk = this.getChunk()
      pathFinder.invalidateChunk(chunk)
    }
  }

  isForegroundTile() {
    return true
  }

  getDropType() {
    throw new Error("must implement BaseForeground#getDropType")
  }

}

Object.assign(BaseForeground.prototype, Destroyable.prototype, {
  onHealthZero() {
    this.remove()
  },
  onPostSetHealth(delta) {
    this.onStateChanged()
  },
  getMaxHealth() {
    return this.getConstants().health
  }
})


module.exports = BaseForeground
