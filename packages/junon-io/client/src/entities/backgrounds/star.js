const BaseEntity = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")

class Star extends BaseEntity {

  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)
  }

  getSpriteContainer() {
    return this.game.sector.backgroundSpriteContainer
  }

  getConstants() {
    return {}  
  }

  getSprite() {
    let texture = PIXI.utils.TextureCache["star.png"]
    const sprite = new PIXI.Sprite(texture)
    sprite.position.x = this.x
    sprite.position.y = this.y
    sprite.width = this.w
    sprite.height = this.h
    sprite.name = "Star"

    return sprite
  }

}

module.exports = Star
