const Grid = require('../../common/entities/grid')
const Constants = require('../../common/constants.json')

class HomeArea {
  constructor(container) {
    this.container = this.sector = container
    this.homeAreaMap = new Grid("home_area", this.container, this.container.getRowCount(), this.container.getColCount())

    this.tileHitsByEntity = {}

    this.changedTiles = {}
  }

  getSocketUtil() {
    return this.container.game.server.socketUtil
  }

  isInHomeArea(row, col) {
    return this.homeAreaMap.get(row, col) !== 0
  }

  getTileCount() {
    return this.homeAreaMap.count()
  }

  getTilesJson() {
    let json = []

    for (let key in this.changedTiles) {
      let tileHit = this.changedTiles[key]
      let data = { row: tileHit.row, col: tileHit.col }
      if (tileHit.value === 0) {
        data["clientMustDelete"] = true
      }
      json.push(data)
    }

    return json
  }

  sendChangedTiles() {
    return

    let tilesJson = this.getTilesJson()
    if (tilesJson.length === 0) return

    for (let id in this.sector.troubleshooters) {
      let player = this.sector.troubleshooters[id]
      this.getSocketUtil().emit(player.getSocket(), "UpdateHomeArea", { tiles: tilesJson })
    }

    this.changedTiles = {}
  }

  addToHomeArea(entity) {
    let owner = entity.getOwner()
    let ownerId = owner ? owner.getId() : -1

    let tileCount = 6
    let homeAreaRadius = tileCount * Constants.tileSize
    let box = entity.getBoxWithRadius(homeAreaRadius)
    let hits = this.homeAreaMap.hitTestTile(box)
    let uncoveredHits = hits.filter((hit) => {
      let hitOwnerId = hit.entity
      return hitOwnerId === 0
    })

    uncoveredHits.forEach((hit) => {
      let tileHit = { row: hit.row, col: hit.col, value: ownerId }
      this.homeAreaMap.set(tileHit)
      this.changedTiles[this.getTileKey(tileHit)] = tileHit
    })

    if (uncoveredHits.length > 0) {
      this.tileHitsByEntity[this.getNamespacedId(entity)] = uncoveredHits
    }
  }

  getTileKey(tile) {
    return [tile.row, tile.col].join("-")
  }

  addRoomToHomeArea(room) {
    let owner = room.getOwner()
    if (!owner) return

    let uncoveredHits = []

    room.forEachInnerTile((hit) => {
      let homeAreaHit = this.homeAreaMap.rowColHitTest(hit.row, hit.col)
      let ownerId = homeAreaHit.entity
      if (ownerId === 0) {
        uncoveredHits.push(homeAreaHit)
        let tileHit = { row: hit.row, col: hit.col, value: owner.getId() }
        this.homeAreaMap.set(tileHit)
        this.changedTiles[this.getTileKey(tileHit)] = tileHit
      }
    })

    if (uncoveredHits.length > 0) {
      this.tileHitsByEntity[this.getNamespacedId(room)] = uncoveredHits
    }
  }

  getNamespacedId(entity) {
    return [entity.constructor.name, entity.id].join("-")
  }

  removeFromHomeArea(entity) {
    let owner = entity.getOwner()
    if (!owner) return

    let tileHits = this.tileHitsByEntity[this.getNamespacedId(entity)]
    delete this.tileHitsByEntity[this.getNamespacedId(entity)]

    if (tileHits) {
      tileHits.forEach((hit) => {
        let tileHit = { row: hit.row, col: hit.col, value: 0 }
        this.homeAreaMap.set(tileHit)
        this.changedTiles[this.getTileKey(tileHit)] = tileHit
      })
    }
  }

}

module.exports = HomeArea
