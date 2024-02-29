const Guard = require('./guard')
const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Sapper extends LandMob {

  getConstantsTable() {
    return "Mobs.Sapper"
  }

  getType() {
    return Protocol.definition().MobType.Sapper
  }

  getSpritePath() {
    return "sapper.png"
  }


  getCorpseSprite() {
    let sprite = super.getCorpseSprite()
    sprite.texture = PIXI.utils.TextureCache["sapper_corpse.png"]
    sprite.height = 181

    return sprite
  }

  getDizzySpriteConfig() {
    return {}
  }
}

module.exports = Sapper
