const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")
const SocketUtil = require("./../util/socket_util")
const SpriteEventHandler = require("./../util/sprite_event_handler")

class StarmapLocation extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.id = data.id // sector id
    this.name = data.name

    this.initInteractivity()
  }

  initInteractivity() {
    this.sprite.interactive = true
    SpriteEventHandler.on(this.sprite, "pointerdown", this.onClick.bind(this))
    SpriteEventHandler.on(this.sprite, "pointerover", this.onMouseOver.bind(this))
    SpriteEventHandler.on(this.sprite, "pointerout", this.onMouseOut.bind(this))
  }

  onClick() {
    SocketUtil.emit("TeleportRequest", { sectorId: this.id })
  }

  onMouseOver() {
    this.game.highlight(this)  
  }

  onMouseOut() {
    this.game.unhighlight(this)  
  }

  getSelectionSpriteParent() {
    return this.baseSprite
  }

  getSpriteContainer() {
    return this.game.sector.starMapLocationContainer
  }

  getSprite() {
    let container = new PIXI.Container()  
    container.name = "location"

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["map_point.png"])
    this.baseSprite.name = "map_point"
    this.baseSprite.anchor.set(0.5)

    const style  = { fontFamily : 'PixelForce', fontSize: 14, fill : 0xffffff, align : 'center', strokeThickness: 4, miterLimit: 3 }
    this.nameSprite = new PIXI.Text(this.data.name, style)
    this.nameSprite.name = "name"
    this.nameSprite.anchor.set(0.5)
    this.nameSprite.position.y = -32

    container.addChild(this.baseSprite)
    container.addChild(this.nameSprite)

    return container
  }

  getSpritePath() {
    return "map_point.png"
  }

  syncWithServer(data) {

  }

  getWidth() {
    return Constants.tileSize
  }

  getHeight() {
    return Constants.tileSize
  }

}

module.exports = StarmapLocation