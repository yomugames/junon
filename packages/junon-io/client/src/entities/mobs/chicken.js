const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Chicken extends LandMob {
  constructor(game, data) {
    super(game, data)

  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  getCharacterSprite() {
    const sprite = new PIXI.Container()
    sprite.name = "Character"
    sprite.pivot.x = this.getWidth() / 2
    sprite.pivot.y = this.getWidth() / 2

    this.body   = new PIXI.Sprite(PIXI.utils.TextureCache["chicken_base.png"])
    this.body.name = "Body"

    this.leftWing   = new PIXI.Sprite(PIXI.utils.TextureCache["chicken_wing_left.png"])
    this.leftWing.name = "LeftWing"
    this.leftWing.position.x = -10
    this.leftWing.position.y = 5

    this.rightWing   = new PIXI.Sprite(PIXI.utils.TextureCache["chicken_wing_right.png"])
    this.rightWing.name = "RightWing"
    this.rightWing.position.x = 15
    this.rightWing.position.y = 5

    sprite.addChild(this.leftWing)
    sprite.addChild(this.rightWing)
    sprite.addChild(this.body)

    return sprite
  }

  getSpritePath() {
    return "chicken.png"
  }

  getConstantsTable() {
    return "Mobs.Chicken"
  }

  getType() {
    return Protocol.definition().MobType.Chicken
  }


}

module.exports = Chicken
