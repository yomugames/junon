const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")
const BitmapText = require("../util/bitmap_text")

class NetworkSprite extends BaseEntity {
  getSprite() {
    let sprite = new PIXI.Container()
    this.sprite = sprite
    sprite.name = "network"
    sprite.alpha = 0.5

    // let texture = PIXI.utils.TextureCache["room_tile.png"]
    // this.baseSprite = new PIXI.Sprite(texture)
    // this.baseSprite.name = "tile"
    // this.baseSprite.width  = Constants.tileSize
    // this.baseSprite.height = Constants.tileSize
    // this.baseSprite.anchor.set(0.5)

    const style  = { fontFamily : 'PixelForce', fontSize: 14, fill : 0xffffff, align : 'center', strokeThickness: 4, miterLimit: 3 }
    this.idSprite = BitmapText.create({
      label: "id",
      text: this.data.id,
      size: 14,
      spriteContainer: sprite
    })

    return sprite
  }

  getSpriteContainer() {
    return this.data.container.spriteLayers[this.getGroup()] 
  }

  remove() {
    if (this.idSprite) {
      this.idSprite.remove()
    }
    
    super.remove()
  }

  getGroup() {
    return this.data.type
  }

  getWidth() {
    return 32
  }

  getHeight() {
    return 32
  }

}

module.exports = NetworkSprite