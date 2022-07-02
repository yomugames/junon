const Constants = require("./../../../common/constants.json")
const BitmapText = require("../util/bitmap_text")

class ChunkRegion {
  constructor(data, sector) {
    this.id = data.id

    this.data = data
    this.sector = sector
    this.tiles = {}
    this.gates = {}

    this.defaultAlpha = 0.3

    this.initSprite()
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

  showDistanceLabel(distance) {
    if (this.distanceText) this.distanceText.remove()

    this.distanceText  = BitmapText.create({
      label: "Distance",
      text: distance, 
      spriteContainer: this.sprite
    })

    this.repositionDistanceLabel()
  }

  repositionDistanceLabel() {
    let center = this.getCenter()
    this.distanceText.sprite.position.x = center.x - (this.distanceText.sprite.width/2)
    this.distanceText.sprite.position.y = center.y
  }

  repositionIdText() {
    let center = this.getCenter()
    this.idText.sprite.position.x = center.x - (this.idText.sprite.width/2)
    this.idText.sprite.position.y = center.y - Constants.tileSize 
  }

  initSprite() {
    this.sprite = new PIXI.Container()
    this.sprite.name = "ChunkRegion"
    this.sprite.visible = false

    this.getSpriteContainer().addChild(this.sprite)
  }

  getId() {
    return this.id
  }

  show(alpha) {
    this.sprite.visible = true
    this.sprite.alpha = alpha || this.defaultAlpha
  }

  focus() {
    this.sprite.alpha = 0.8
  }

  unfocus() {
    this.sprite.alpha = this.defaultAlpha
  }

  hide() {
    this.sprite.visible = false
  }

  getSpriteContainer() {
    return this.sector.chunkRegionContainer
  }

  syncWithServer(data) {
    this.chunkId = data.chunkId

    this.setTiles(data.tiles)
    this.setGates(data.gates)
    this.drawTileEdges()
    this.drawIdLabel()

    this.registerToChunk()
  }

  drawIdLabel() {
    this.idText  = BitmapText.create({
      label: "ChunkRegionId",
      text: this.id,
      anchor: 0,
      spriteContainer: this.sprite
    })

    this.idText.sprite.tint = 0xeadd2b
    this.repositionIdText()
  }

  registerToChunk() {
    this.getChunk().registerChunkRegion(this)
  }

  unregisterFromChunk() {
    this.getChunk().unregisterChunkRegion(this)
  }

  remove() {
    this.unregisterFromChunk()

    this.sprite.parent.removeChild(this.sprite)

    if (this.idText) {
      this.idText.remove()
    }

    if (this.distanceText) {
      this.distanceText.remove()
    }
  }


  drawTileEdges() {
    for (let tileKey in this.tiles) {
      let tile = this.tiles[tileKey]
      this.drawEdges(tile)
    }
  }

  getSideHits(tile) {
    const result = { left: false, up: false, right: false, down: false }

    if (this.getChunkRegionTile(tile.row, tile.col - 1)) {
      result.left = true
    }

    if (this.getChunkRegionTile(tile.row - 1, tile.col )) {
      result.up = true
    }

    if (this.getChunkRegionTile(tile.row, tile.col + 1)) {
      result.right = true
    }

    if (this.getChunkRegionTile(tile.row + 1, tile.col )) {
      result.down = true
    }

    return result
  }

  getChunkRegionTile(row, col) {
    return this.tiles[this.getTileKey({ row: row, col: col })]
  }

  hasTile(row, col) {
    let tileKey = this.getTileKey({ row: row, col: col })
    return this.tiles[tileKey]
  }

  drawEdges(tile) {
    const sideHits = this.getSideHits(tile)

    for (let direction in sideHits) {
      let hasTileInDirection = sideHits[direction]

      if (!hasTileInDirection) {
        let edgeSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getEdgeSpritePath()])
        edgeSprite.tint = 0x00ff00
        edgeSprite.name = "chunk_region_tile_edge_" + direction
        edgeSprite.height = this.getEdgeWidth()
        // edgeSprite.anchor.set(0.5)
        tile.tileSprite.addChild(edgeSprite)

        let offset = 0
        let padding = this.getEdgePadding()

        switch(direction) {
          case "left":
            edgeSprite.rotation = 90 * PIXI.DEG_TO_RAD
            edgeSprite.position.x = 0
            break
          case "up":
            edgeSprite.rotation = 0
            edgeSprite.position.y = 0
            break
          case "right":
            edgeSprite.rotation = 90 * PIXI.DEG_TO_RAD
            edgeSprite.position.x = Constants.tileSize
            break
          case "down":
            edgeSprite.rotation = 0
            edgeSprite.position.y = Constants.tileSize
            break
        }
      }
    }
  }

  getEdgePadding() {
    return 1
  }

  getEdgeSpritePath() {
    return 'platform_edge_white.png'
  }

  getEdgeWidth() {
    return 3
  }

  setTiles(tiles) {
    for (var i = 0; i < tiles.length; i++) {
      let tile = tiles[i]
      tile.tileSprite = this.createTileSprite(tile.row, tile.col)
      this.registerTile(tile)
      this.sprite.addChild(tile.tileSprite)
    }
  }

  setGates(gates) {
    for (var i = 0; i < gates.length; i++) {
      let gate = gates[i]
      this.gates[gate.id] = gate
    }
  }

  getChunk() {
    let row = this.chunkId.split("-")[0]
    let col = this.chunkId.split("-")[1]
    
    return this.sector.getChunk(row, col)
  }

  registerTile(tile) {
    let tileKey = this.getTileKey(tile)
    this.tiles[tileKey] = tile
  }

  getTileKey(tile) {
    return [tile.row, tile.col].join("-")
  }

  getTileSpritePath() {
    return "room_tile.png"
  }

  createTileSprite(row, col) {
    let container = new PIXI.Container()
    container.name = "chunk_region_tile"

    container.width  = Constants.tileSize
    container.height = Constants.tileSize
    container.position.x = col * Constants.tileSize
    container.position.y = row * Constants.tileSize

    let texture = PIXI.utils.TextureCache[this.getTileSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "chunk_region_tile_background"
    sprite.tint = 0x0000ff

    container.addChild(sprite)
    return container
  }

}

module.exports = ChunkRegion