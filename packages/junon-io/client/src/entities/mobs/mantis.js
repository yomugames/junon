const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Mantis extends LandMob {
  constructor(game, data) {
    super(game, data)

  }

  getSpritePath() {
    return "mantis.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  getConstantsTable() {
    return "Mobs.Mantis"
  }

  getType() {
    return Protocol.definition().MobType.Mantis
  }
}

module.exports = Mantis
