const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Golem extends LandMob {
  constructor(game, data) {
    super(game, data)

  }

  getSpritePath() {
    return "golem.png"
  }

  getConstantsTable() {
    return "Mobs.Golem"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  createUsernameSprite() {
    super.createUsernameSprite()
    this.usernameText.sprite.position.y = 80
  }

  getCorpseSprite() {
    let sprite = super.getCorpseSprite()
    sprite.texture = PIXI.utils.TextureCache["golem_corpse.png"]
    sprite.width = 80
    sprite.height = 80

    return sprite
  }

  getDizzySpriteConfig() {
    return {}
  }

  getType() {
    return Protocol.definition().MobType.Golem
  }

}

module.exports = Golem
