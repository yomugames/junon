const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipper  = require("./../../../../common/interfaces/equipper")

class Slave extends LandMob {
  constructor(game, data) {
    super(game, data)

    this.initEquipper()
  }

  onHighlighted() {
  }

  getEntityMenuName() {
    return `${this.name} (${this.getTypeName()})` 
  }

  getBaseRotationOffset() {
    return 0 * PIXI.DEG_TO_RAD
  }

  getWidth() {
    return 40
  }

  getHeight() {
    return 40
  }

  isInteractable() {
    return true
  }

  getConstantsTable() {
    return "Mobs.Slave"
  }

  getSpritePath() {
    return "blue_slave.png"
  }

  getType() {
    return Protocol.definition().MobType.Slave
  }

}

Object.assign(Slave.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0x252e4e
  },
  getBodySpriteTint() {
    return 0xffffff
  },
  getEquipperBodySpritePath() {
    return "blue_slave.png"
  },
  getBodyWidth() {
    return 50
  },
  getBodyHeight() {
    return 40
  },
  getBodyPositionX() {
    return -10
  }
})


module.exports = Slave

