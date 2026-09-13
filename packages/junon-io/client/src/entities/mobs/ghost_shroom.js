const BaseMob = require('./base_mob')
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class GhostShroom extends BaseMob {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "ghost_shroom.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition, 100)
    this.attackTween.start()
  }


  getConstantsTable() {
    return "Mobs.GhostShroom"
  }

  getType() {
    return Protocol.definition().MobType.GhostShroom
  }

  getCorpseSprite() {
    let sprite = super.getCorpseSprite()
    sprite.texture = PIXI.utils.TextureCache["ghost_shroom_corpse.png"]
    sprite.width = 128
    sprite.height = 160

    return sprite
  }


}

module.exports = GhostShroom

