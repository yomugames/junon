const BaseEntity  = require("./base_entity")
const Buildings  = require("./buildings/index")
const Constants = require("./../../../common/constants.json")
const Item = require("./item")
const BitmapText = require("../util/bitmap_text")

class Pickup extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.type = data.item.type
    this.count = data.item.count

    this.tween = this.getFloatingTween()
    this.tween.start()

    this.chunks = {}

    this.registerToChunk()
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  getGroup() {
    return "pickups"
  }

  remove() {
    super.remove()

    if (this.pickupCountText) {
      this.pickupCountText.remove()
    }

    this.getContainer().unregisterEntity("pickups", this)

    if (this.chunk) {
      this.chunk.unregister("pickups", this)
    }

    this.cleanupTween()
  }

  getFloatingTween() {
    let origPosition = this.sprite.position.y

    let position = { position: origPosition }

    return new TWEEN.Tween(position)
        .to({ position: origPosition + 20 }, 1000)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          this.sprite.position.y = position.position
        })
        .yoyo(true)
        .repeat(Infinity)
  }

  getSprite() {
    let sprite = new PIXI.Container()
    sprite.name = "Pickup"

    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let itemSprite = new PIXI.Sprite(texture)
    itemSprite.width  = Math.min(itemSprite.width, Constants.tileSize)
    itemSprite.height = Math.min(itemSprite.height, Constants.tileSize)
    itemSprite.rotation = -90 * PIXI.DEG_TO_RAD

    const countText = this.data.item.count

    this.pickupCountText = BitmapText.create({
      label: "PickupCount",
      text: countText, 
      align: 'center',
      anchor: 0,
      size: 20,
      spriteContainer: sprite
    })

    this.pickupCountText.sprite.position.x = 21
    this.pickupCountText.sprite.position.y = -13

    sprite.addChildAt(itemSprite, 0)

    return sprite
  }

  getSpriteContainer() {
    return this.data.container.spriteLayers["pickups"]
  }

  getSpritePath() {
    return Item.getSpritePath(this.data.item.type)
  }

  syncWithServer(data) {
  }

  getYScale() {
    let scale = (Constants.tileSize * 2)  / Item.getHeight(this.data.item.type)  
    return Math.min(scale, 1)
  }

  getXScale() {
    let scale = (Constants.tileSize * 2)  / Item.getWidth(this.data.item.type)  
    return Math.min(scale, 1)
  }

  getConstantsTable() {
    return "Pickup"
  }
}

module.exports = Pickup
