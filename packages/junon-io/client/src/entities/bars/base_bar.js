const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")

class BaseBar extends BaseEntity {
  constructor(options) {
    const data = { x: 0, y: 0, player: options.player }

    super(options.player.game, data)
  }

  getSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    sprite.width = this.getWidth()
    sprite.height = this.getHeight()
    return sprite
  }

  static getSellGroup() {
    return "Bars"
  }

  getSpriteContainer() {
    return this.data.player.characterSprite
  }

  static build(game, data) {
    return new this(game, data)
  }

  getType() {
    throw new Error("must implement BaseBar.getType")
  }

}

module.exports = BaseBar
