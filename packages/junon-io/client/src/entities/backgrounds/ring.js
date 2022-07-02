const BaseEntity = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")

class Ring extends BaseEntity {

  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)
  }

  getSpriteContainer() {
    return this.game.backgroundSpriteContainer
  }

  getSprite() {
    let circle = new PIXI.Graphics()
    circle.lineStyle(10, 0x777777, 0.2)
    circle.drawCircle(0, 0, this.w)
    circle.endFill()
    circle.position.x = this.x
    circle.position.y = this.y
    const sprite = circle

    // let texture = PIXI.utils.TextureCache["yellow_planet_circle.png"]
    // const sprite = new PIXI.Sprite(texture)
    // sprite.position.x = this.x
    // sprite.position.y = this.y
    // sprite.width = this.w
    // sprite.height = this.h

    return sprite
  }

}

module.exports = Ring
