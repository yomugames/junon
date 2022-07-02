const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipper  = require("./../../../../common/interfaces/equipper")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipments = require("./../equipments/index")


class Human extends LandMob {
  constructor(game, data) {
    super(game, data)

    this.initEquipper()
  }

  getSpritePath() {
    return "human.png"
  }

  getSprite() {
    let sprite = super.getSprite()
    Interpolator.mixin(this.characterSprite)
    return sprite
  }

  getBaseRotationOffset() {
    return 0 * PIXI.DEG_TO_RAD
  }

  renderDeadBody() {
    this.addDizzyEyes(this.body)
    this.dizzySprite.anchor.set(0)
    this.dizzySprite.rotation = Math.PI/2
    this.dizzySprite.tint = 0x000000
    this.dizzySprite.width = 24
    this.dizzySprite.height = 8
    this.dizzySprite.position.x = 30
    this.dizzySprite.position.y = 8

    this.openHands()
    this.removeEquipments()
  }

  getConstantsTable() {
    return "Mobs.Human"
  }

  getType() {
    return Protocol.definition().MobType.Human
  }


}

Object.assign(Human.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0xd2b48c
  },
  getBodySpriteTint() {
    return 0xd2b48c
  }
})


module.exports = Human
