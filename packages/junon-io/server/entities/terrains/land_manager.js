const Land = require("./land")
const Helper = require("../../../common/helper")

class LandManager {
  constructor(sector) {
    this.sector = sector
    this.lands = {}
  }

  cleanup() {
    for (let id in this.lands) {
      let land = this.lands[id]
      land.remove()
    }

    this.lands = {}
  }

  findOrCreateLand(tile) {
    let land = this.getLand(tile.getRow(), tile.getCol())
    
    if (!land) {
      land = this.createLand(tile)
    }

    return land
  }

  getTileCount() {
    let result = 0

    this.forEachLand((land) => {
      result += land.getTileCount()
    })

    return result
  }

  getFirstLand() {
    return Object.values(this.lands)[0]
  }

  forEachLand(cb) {
    for (let id in this.lands) {
      let land = this.lands[id]
      cb(land)
    }
  }

  forEachRandomLand(cb) {
    let landList = Object.values(this.lands)

    const randomIndexList = Helper.randomIndexList(landList)

    for (var i = 0; i < randomIndexList.length; i++) {
      let index = randomIndexList[i]
      cb(landList[index])
    }
  }

  createLand(tile) {
    let land = new Land(this.sector, tile)
    this.lands[land.getId()] = land
    return land
  }

  getLand(row, col) {
    return Object.values(this.lands).find((land) => {
      return land.hasTile(row, col)
    })
  }

  getUnoccupiedLands(landList) {
    return landList.filter((land) => {
      return land.getOccupancyRate() < 0.01 && land.getTileCount() > 40
    })
  }

  findRandomSuitableLands() {
    let landList = Object.values(this.lands).filter((land) => {
      return land.hasWaterEdge() && land.isSuitableForLanding()
    })

    if (landList.length === 0) {
      landList = Object.values(this.lands)
    }

    Helper.shuffleArray(landList)
    return landList
  }

}

module.exports = LandManager