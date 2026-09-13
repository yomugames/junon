const BaseSeed = require("./base_seed")
const Ores = require("../../ores")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class Sapling extends BaseSeed {
  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
    this.content = data.content
    this.applyTint()
  }

  getType() {
    return Protocol.definition().BuildingType.Sapling
  }

  getMatureSpritePath() {
    return "sapling_mature.png"
  }

  getSpritePath() {
    return "sapling.png"
  }

  getRotatedWidth() {
    return this.getWidth()
  }

  getRotatedHeight() {
    return this.getHeight()
  }

  getSporeTint() {
    const itemKlass = this.content ? Ores.forType(parseInt(this.content)) : null
    const tint = itemKlass && itemKlass.prototype.getConstants().tint
    return tint ? parseInt(tint, 16) : null
  }
  
  applyTint() {
    const tint = this.getSporeTint()
      if (!tint || this.isEquipDisplay) {
      this.buildingSprite.tint = 0xffffff
      this.buildingSprite.filters = null
      this.updateChunkSprite()
      return
    }

    const texture = this.buildingSprite.texture
    if (!texture || !texture.valid || this.buildingSprite.width <= 0 || this.buildingSprite.height <= 0) {
      this.buildingSprite.tint = 0xffffff
      this.buildingSprite.filters = null
      this.updateChunkSprite()
      return
    }

    const red = ((tint >> 16) & 0xff) / 255
    const green = ((tint >> 8) & 0xff) / 255
    const blue = (tint & 0xff) / 255
    const colorFilter = new PIXI.filters.ColorMatrixFilter()
    colorFilter.matrix = [
      0, red, 0, 0, 0,
      0, green, 0, 0, 0,
      0, blue, 0, 0, 0,
      0, 0, 0, 1, 0
    ]

    this.buildingSprite.tint = 0xffffff
    this.buildingSprite.filters = [colorFilter]
    this.updateChunkSprite()
  }
  
  getDefaultSpriteColor() {
    return this.getSporeTint() || 0xffffff
  }

  animateDamage() {
    if (this.hasCategory("custom_colors")) return
    if (this.spriteRestoreTimeout) return

    this.buildingSprite.filters = null
    this.setTint(this.getTintableSprite(), 0xff6d6d)

    this.spriteRestoreTimeout = setTimeout(() => {
      this.applyTint()
      this.spriteRestoreTimeout = null
    }, 100)
  }

  onContentChanged() {
    this.applyTint()
  }

  getConstantsTable() {
    return "Crops.Sapling"
  }

}

module.exports = Sapling
