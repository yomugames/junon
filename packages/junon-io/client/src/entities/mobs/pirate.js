const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipper  = require("./../../../../common/interfaces/equipper")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipments = require("./../equipments/index")


class Pirate extends LandMob {
  constructor(game, data) {
    super(game, data)

    this.characterSprite.tint = 0x444444 // dark + red line eyes maybe

    this.initEquipper()
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
    this.dizzySprite.width  = 25
    this.dizzySprite.height = 10
    this.dizzySprite.position.x = 25
    this.dizzySprite.position.y = 25
    this.dizzySprite.rotation = 90 * Math.PI/180

    this.openHands()
    this.removeEquipments()
  }

  getConstantsTable() {
    return "Mobs.Pirate"
  }

  getType() {
    return Protocol.definition().MobType.Pirate
  }


}

Object.assign(Pirate.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0x444444
  },
  getBodySpriteTint() {
    return 0x444444
  }
})


module.exports = Pirate
