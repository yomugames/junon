const Constants = require("./../../../common/constants.json")
const BoundingBox = require("./../../../common/interfaces/bounding_box")
const Helper = require("./../../../common/helper")
const ClientHelper = require("./../util/client_helper")
const BitmapText = require("../util/bitmap_text")

/*
  NOTE:
    Room is meant for visualzing rooms (i.e determinining if oxygenated)
    The tiles in this room function as a debugging mechanism for determining which are designated rooms
    They only contain row, col information as opposed to what the tiles actually are

*/
class Room {
  constructor(data, sector) {
    this.id = data.id
    this.sector = sector
    this.container = data.container
    this.game = sector.game
    this.data = data
    this.tiles = {}
    this.chunks = {}

    this.initSprite()
  }

  // to remove overlap in rendering door platform tiles overlay
  getUnoccupiedTiles(tiles) {
    return tiles.filter((tile) => {
      return !this.isTileOccupied(tile)
    })
  }

  getCenter() {
    let rowSum = 0
    let colSum = 0

    Object.values(this.tiles).forEach((tile) => {
      rowSum += tile.row
      colSum += tile.col
    })

    let centerX = (colSum / Object.keys(this.tiles).length) * Constants.tileSize
    let centerY = (rowSum / Object.keys(this.tiles).length) * Constants.tileSize

    return {
      x: centerX,
      y: centerY
    }
  }

  getChunks() {
    let boundingBox = this.getBoundingBox()
    let chunksById = Helper.getChunksFromBoundingBox(this.sector, boundingBox)
    return Object.values(chunksById)
  }

  hasTile(row, col) {
    let tileKey = [row, col].join("-")
    return this.tiles[tileKey]
  }

  initSprite() {
    if (!this.shouldCreateSprites()) return

    this.sprite = new PIXI.Container()
    this.sprite.name = "room"
    this.sprite.alpha = 0

    // if (this.sprite.anchor) this.sprite.anchor.set(0.5)
    this.getSpriteContainer().addChild(this.sprite)

    this.labelText  = BitmapText.create({
      label: "RoomId",
      text: "Room " + this.id,
      size: 18,
      anchor: 0,
      spriteContainer: this.container.effectsContainer
    })

    this.labelText.sprite.tint = 0x34ccfd
  }

  repositionRoomLabel() {
    if (!this.shouldCreateSprites()) return

    this.labelText.sprite.position.x = this.x - (this.labelText.sprite.width/2)
    this.labelText.sprite.position.y = this.y
  }

  getContainer() {
    return this.sector
  }

  isTileOccupied(tile) {
    return this.container.roomTileMap.get(tile.row, tile.col)
  }

  registerTile(tile) {
    this.container.roomTileMap.set({ row: tile.row, col: tile.col, value: tile  })
  }

  unregisterTile(tile) {
    this.container.roomTileMap.set({ row: tile.row, col: tile.col, value: 0  })
  }

  remove() {
    Object.values(this.tiles).forEach((tile) => {
      this.unregisterTile(tile)
    })

    this.getContainer().unregisterEntity("rooms", this)
    this.unregisterFromChunks()

    if (this.labelText) {
      this.labelText.remove()
    }

    ClientHelper.removeSelfAndChildrens(this.sprite)
    this.cleanupTween()
  }

  cleanupTween() {
    if (this.alarmTween) {
      this.alarmTween.stop()
    }
  }

  syncWithServer(data) {
    if (data.hasOwnProperty("oxygenPercentage")) {
      this.setOxygenPercentage(data.oxygenPercentage)
    }

    if (data.tiles) {
      this.syncTiles(Object.values(data.tiles))
    }

    if (data.edgeTiles) {
      this.syncTiles(Object.values(data.edgeTiles))
    }

    if (data.hasOwnProperty('x')) {
      this.x = data.x
      this.y = data.y

      this.repositionRoomLabel()
    }
    
    this.updateRbushCoords()
    this.registerToChunks()
  }

  getWidth() {
    let minX = 1000000
    let maxX = 0

    Object.values(this.tiles).map((hit) => {
      let leftEdge  = (hit.col * Constants.tileSize) - Constants.tileSize / 2
      let rightEdge = (hit.col * Constants.tileSize) + Constants.tileSize / 2

      minX = Math.min(minX, leftEdge)
      maxX = Math.max(maxX, rightEdge)
    })

    return maxX - minX
  }

  getHeight() {
    let minY = 1000000
    let maxY = 0

    Object.values(this.tiles).map((hit) => {
      let topEdge    = (hit.row * Constants.tileSize) - Constants.tileSize / 2
      let bottomEdge = (hit.row * Constants.tileSize) + Constants.tileSize / 2

      minY = Math.min(minY, topEdge)
      maxY = Math.max(maxY, bottomEdge)
    })

    return maxY - minY
  }

  registerToChunks() {
    this.getChunks().forEach((chunk) => {
      chunk.register("rooms", this)
    })
  }

  unregisterFromChunks() {
    this.getChunks().forEach((chunk) => {
      chunk.unregister("rooms", this)
    })
  }

  getTileKey(tile) {
    return [tile.row, tile.col].join("-")
  }

  syncTiles(tiles) {
    if (!tiles) return

    tiles.forEach((tile) => {
      let tileKey = this.getTileKey(tile)
      if (tile.clientMustDelete) {
        this.removeTile(tileKey)
      } else if (!this.tiles[tileKey]) {
        this.tiles[tileKey] = this.createTile(tile)
      }
    })

    this.repositionRoomLabel()
  }

  removeTile(tileKey) {
    let tile = this.tiles[tileKey]

    if (tile) {
      if (tile.sprite) {
        this.sprite.removeChild(tile.sprite)
      }

      this.unregisterTile(tile)
    }

    delete this.tiles[tileKey]
  }

  createTile(data) {
    let tile = { row: data.row, col: data.col }

    tile.room = this
    this.registerTile(tile)

    if (this.shouldCreateSprites()) {
      tile.sprite = this.createTileSprite(tile.row, tile.col)
      this.sprite.addChild(tile.sprite)
    }

    return tile
  }

  shouldCreateSprites() {
    return window.debugRoom || debugMode
  }

  setOxygenPercentage(oxygenPercentage) {
    this.oxygenPercentage = oxygenPercentage
  }

  hide() {
    if (!this.shouldCreateSprites()) return
    this.sprite.alpha = 0
  }

  show() {
    if (!this.shouldCreateSprites()) return
    this.sprite.alpha = 1
  }

  createTileSprite(row, col) {
    let texture = PIXI.utils.TextureCache[this.getTileSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "room_tile"
    sprite.tint = 0xff0000
    sprite.width  = Constants.tileSize
    sprite.height = Constants.tileSize
    sprite.position.x = col * Constants.tileSize
    sprite.position.y = row * Constants.tileSize
    sprite.alpha = 0.6
    return sprite
  }

  getTileSpritePath() {
    return "room_tile.png"
  }

  getSpriteContainer() {
    return this.data.container.spriteLayers[this.getGroup()]
  }

  getGroup() {
    return "rooms"
  }
}

Object.assign(Room.prototype, BoundingBox.prototype, {
  getX() {
    return this.x
  },
  getY() {
    return this.y
  }
})

module.exports = Room
