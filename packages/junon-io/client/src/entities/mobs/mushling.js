const LandMob = require('./land_mob')
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Mushling extends LandMob {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "mushling.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }


  getConstantsTable() {
    return "Mobs.Mushling"
  }

  getType() {
    return Protocol.definition().MobType.Mushling
  }

  getCorpseSprite() {
    let sprite = super.getCorpseSprite()
    sprite.texture = PIXI.utils.TextureCache["red_mushroom_plant.png"]
    sprite.width = 64
    sprite.height = 64

    return sprite
  }


}

module.exports = Mushling

