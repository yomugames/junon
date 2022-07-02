const Guard = require('./guard')
const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Trooper extends LandMob {

  getConstantsTable() {
    return "Mobs.Trooper"
  }

  getType() {
    return Protocol.definition().MobType.Trooper
  }

  getSpritePath() {
    return "trooper_active.png"
  }

  getCorpseSprite() {
    let sprite = super.getCorpseSprite()
    sprite.texture = PIXI.utils.TextureCache["trooper_corpse.png"]
    sprite.height = 40

    return sprite
  }

  getDizzySpriteConfig() {
    return {}
  }
}

module.exports = Trooper
