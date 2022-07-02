const Constants = require("./../../../common/constants.json")

class HomeArea {
  constructor(container) {
    this.container = container

    this.tiles = {}

    this.initSprite()
  }

  initSprite() {
    this.sprite = new PIXI.Container()
    this.sprite.name = "home_area"
    this.sprite.alpha = 0

    this.getSpriteContainer().addChild(this.sprite)
  }

  syncWithServer(data) {
    this.syncTiles(data.tiles)
  }

  syncTiles(tiles) {
    if (!tiles) return

    tiles.forEach((data) => {
      let tileKey = this.getTileKey(data)
      if (data.clientMustDelete) {
        let tile = this.tiles[tileKey]
        this.removeTile(tile, tileKey)
      } else if (!this.tiles[tileKey]) {
        this.createTile(data, tileKey)
      }
    })
  }

  getTileKey(tile) {
    return [tile.row, tile.col].join("-")
  }

  getSpriteContainer() {
    return this.container.spriteLayers[this.getGroup()]
  }

  getGroup() {
    return "home_areas"
  }

  getTileSpritePath() {
    return "room_tile.png"
  }

  createTile(data, tileKey) {
    let tile = { 
      row: data.row, 
      col: data.col,
      sprite: this.createTileSprite(data.row, data.col)
    }

    this.sprite.addChild(tile.sprite)
    this.tiles[tileKey] = tile

    return tile
  }

  removeTile(tile, tileKey) {
    if (this.sprite && tile) {
      this.sprite.removeChild(tile.sprite)
    }
    
    delete this.tiles[tileKey]
  }

  createTileSprite(row, col) {
    let texture = PIXI.utils.TextureCache[this.getTileSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "room_tile"
    sprite.width  = Constants.tileSize
    sprite.height = Constants.tileSize
    sprite.position.x = col * Constants.tileSize
    sprite.position.y = row * Constants.tileSize
    sprite.alpha = 0.6
    return sprite
  }

}

module.exports = HomeArea