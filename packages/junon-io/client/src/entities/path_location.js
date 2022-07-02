const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")

class PathLocation extends BaseEntity {
  constructor(path, data) {
    super(path.game, data)

    this.path = path
    this.data = data
    this.row = data.row
    this.col = data.col
    this.direction = data.direction
    this.distance = data.distance

    this.buildSprite()
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {}

      let count = 150
      for (var i = 0; i <= count; i++) {
        let text = new PIXI.Text(i, {fontSize: 20, fontFamily: "Arial", align: "center", fill : 0xeeeeee })
        text.updateText()
        this.textures[i] = text.texture
      }

    }

    return this.textures
  }

  getTypeName() {
    return "Path"
  }

  getSelectionSprite() {
    const padding = 2
    const w = this.getWidth()
    const h = this.getHeight()
    const graphics = new PIXI.Graphics()
    graphics.name = "Selection"
    const lineStyle = this.getSelectionLineStyle()
    graphics.lineStyle(lineStyle.lineWidth, lineStyle.color)
    graphics.drawRect(-w/2 + padding, -h/2 + padding, w - (padding * 2), h - (padding * 2))
    graphics.endFill()

    return graphics
  }


  getWidth() {
    return Constants.tileSize
  }

  getHeight() {
    return Constants.tileSize
  }

  getRow() {
    return this.row
  }

  getCol() {
    return this.col
  }

  getX() {
    return this.getCol() * Constants.tileSize + Constants.tileSize/2
  }

  getY() {
    return this.getRow() * Constants.tileSize + Constants.tileSize/2
  }

  initSprite() {
    // use our own
  }

  buildSprite() {
    let sprite = new PIXI.Container()
    this.sprite = sprite
    sprite.name = "path_tile"
    sprite.position.x = this.col * Constants.tileSize + Constants.tileSize / 2
    sprite.position.y = this.row * Constants.tileSize + Constants.tileSize / 2
    sprite.alpha = 0.5

    sprite.addChild(this.getBaseSprite())

    if (this.shouldShowDirection()) {
      let angle = Math.atan2(this.direction.y, this.direction.x)
      let isZeroDirection = this.direction.x === 0 && this.direction.y === 0
      if (!isZeroDirection) {
        sprite.addChild(this.getArrowSprite(angle))
      }
    }

    sprite.addChild(this.getDistanceSprite(this.distance))

    return sprite
  }

  shouldShowDirection() {
    return true
  }

  getBaseSprite() {
    let texture = PIXI.utils.TextureCache[this.getTileSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "tile"
    sprite.tint = 0x0000ff
    sprite.width  = Constants.tileSize
    sprite.height = Constants.tileSize
    sprite.anchor.set(0.5)
    return sprite
  }

  getTileSpritePath() {
    return "room_tile.png"
  }

  getArrowSprite(angle) {
    let texture = PIXI.utils.TextureCache["arrow.png"]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "arrow"
    sprite.tint = 0x00ff00
    sprite.rotation = angle
    sprite.anchor.set(0.5)
    return sprite
  }

  getDistanceSprite(distance) {
    let sprite = new PIXI.Sprite(this.constructor.getTextures()[distance])
    sprite.name = "distance"
    sprite.anchor.set(0.5)
    return sprite
  }

}


module.exports = PathLocation
