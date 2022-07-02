const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Mutant extends LandMob {
  constructor(game, data) {
    super(game, data)

  }

  getWidth() {
    return 56
  }

  getHeight() {
    return 40
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  getSpritePath() {
    return "mutant.png"
  }

  getConstantsTable() {
    return "Mobs.Mutant"
  }

  getType() {
    return Protocol.definition().MobType.Mutant
  }


}

module.exports = Mutant
