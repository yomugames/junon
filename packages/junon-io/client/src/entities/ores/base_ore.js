const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BaseOre extends BaseEntity {
  constructor(game, data) {
    data.x = 0
    data.y = 0

    super(game, data)

    this.repositionSprite()
  }

  static getSellGroup() {
    return "Ores"
  }

  onPostEquip() {

  }

  syncWithServer() {
    
  }


  getSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    sprite.width = this.getWidth()
    sprite.height = this.getHeight()
    return sprite
  }

  getSpriteContainer() {
    if (this.data.user.isBuildingType()) {
      return this.data.user.buildingSprite
    } else {
      return this.data.user.characterSprite
    }
  }

  repositionSprite() {
    this.sprite.anchor.set(0)
    this.sprite.position.x = 40
    this.sprite.position.y = 10
  }

  static build(game, data) {
    return new this(game, data)
  }

  getType() {
    throw new Error("must implement BaseOre.getType")
  }

}

module.exports = BaseOre
