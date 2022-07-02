const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")
const BitmapText = require("../util/bitmap_text")

class Region extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.id = data.id
    this.sector = game.sector

    this.onRegionCreated()
  }

  redrawSprite() {
    this.drawFill()
    this.drawIdLabel()
  }

  getFlag(flag) {
    return this.flags[flag]
  }

  drawFill() {
    this.sprite.scale.set(1)
    this.fillSprite.scale.set(1)
    this.fillSprite.width  = this.w
    this.fillSprite.height = this.h
  }

  drawIdLabel() {
    if (!this.idText) {
      this.idText  = BitmapText.create({
        label: "RegionId",
        text: this.name,
        anchor: 0,
        spriteContainer: this.sprite
      })

      this.idText.sprite.tint = 0xeadd2b
    } else {
      this.idText.sprite.text = this.name
    }

    this.repositionIdText()
  }

  getCenter() {
    return { x: this.x, y: this.y } 
  }

  repositionIdText() {
    let xDisplacement = this.name.length * 5
    this.idText.sprite.position.x = -xDisplacement
    this.idText.sprite.position.y = -10
  }

  onRegionCreated() {
    this.sector.addRegion(this)
  }

  getSpritePath() {
    return "white.png"
  }

  createSprite(texture) {
    return new PIXI.Sprite(texture)
  }

  getSpriteContainer() {
    return this.sector.regionContainer
  }

  getSprite() {
    let sprite = new PIXI.Container()
    sprite.name = this.constructor.name
    sprite.scale.set(1)

    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    this.fillSprite = new PIXI.Sprite(texture)
    this.fillSprite.name = 'RegionFill'
    this.fillSprite.anchor.set(0.5)
    this.fillSprite.alpha = 0.3
    this.fillSprite.tint = 0x0000ff
    this.fillSprite.scale.set(1)
    sprite.addChild(this.fillSprite)

    return sprite
  }

  show() {
    this.sprite.alpha = 0.3
  }

  hide() {
    this.sprite.alpha = 0
  }

  getStart() {
    return {
      x: this.getX() - this.getWidth()  / 2,
      y: this.getY() - this.getHeight() / 2
    }
  }

  remove() {
    super.remove()

    if (this.idText) {
      this.idText.remove()
    }

    this.sector.removeRegion(this)
  }

  syncWithServer(data) {
    this.sprite.position.x = data.x
    this.sprite.position.y = data.y

    this.name = data.name
    this.x = data.x
    this.y = data.y
    this.w = this.sprite.width = data.w
    this.h = this.sprite.height = data.h

    this.redrawSprite()
    this.updateRbushCoords()

    this.onBoundsChanged()

    this.flags = data.flags
    this.onFlagsChanged()
  }

  updateRbushCoords() {
    this.minX = this.x - this.w/2
    this.maxX = this.x + this.w/2
    this.minY = this.y - this.h/2
    this.maxY = this.y + this.h/2
  }

  onBoundsChanged() {
    if (!this.isInvalidBoundingBox(this)) {
      this.sector.regionTree.remove(this)
      this.sector.regionTree.insert(this)
    }
  }

  isInvalidBoundingBox(entity) {
    return isNaN(entity.minX) || isNaN(entity.maxX) || isNaN(entity.minY) || isNaN(entity.maxY)
  }

  onFlagsChanged() {
    if (this.flags.map_label === 'allow') {
      // draw on map
      this.game.mapMenu.addLabel(this.id, this.name, this.x, this.y)
    } else if (this.flags.map_label === 'deny') {
      this.game.mapMenu.removeLabel(this.id)
    }
  }

  getWidth() {
    return this.w
  }

  getHeight() {
    return this.h
  }

}

module.exports = Region