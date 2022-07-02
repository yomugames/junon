const BaseEntity = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")

class Planet extends BaseEntity {

  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)
  }

  getSpriteContainer() {
    return this.game.sector.backgroundSpriteContainer
  }

  getSprite() {
    let circle = new PIXI.Graphics()
    circle.beginFill(0xffd170)
    circle.drawCircle(0, 0, this.w)
    circle.endFill()
    circle.beginFill(0xe5a217)
    circle.drawCircle(0, 0, this.w - 20)
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

module.exports = Planet
