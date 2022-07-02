const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipper  = require("./../../../../common/interfaces/equipper")

class Trader extends LandMob {
  constructor(game, data) {
    super(game, data)

    this.initEquipper()
  }

  getSpritePath() {
    return "trader.png"
  }

  openMenu() {
    this.game.tradeMenu.open(this)
  }

  getBaseRotationOffset() {
    return 0 * PIXI.DEG_TO_RAD
  }

  isInteractable() {
    return true
  }

  getSprite() {
    let sprite = super.getSprite()

    this.hat  = new PIXI.Sprite(PIXI.utils.TextureCache["cowboy_hat.png"])
    this.hat.anchor.set(0.5)
    this.hat.position.x = 10
    this.hat.position.y = 20

    this.characterSprite.addChild(this.hat)

    return sprite
  }

  renderDeadBody() {
    this.addDizzyEyes(this.body)
    this.dizzySprite.width  = 25
    this.dizzySprite.height = 10
    this.dizzySprite.position.x = 25
    this.dizzySprite.position.y = 25
    this.dizzySprite.rotation = 90 * Math.PI/180
  }

  getConstantsTable() {
    return "Mobs.Trader"
  }

  getType() {
    return Protocol.definition().MobType.Trader
  }


}

Object.assign(Trader.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0xd2b48c
  }
})


module.exports = Trader
