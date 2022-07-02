const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Prisoner extends LandMob {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "prisoner.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }


  getConstantsTable() {
    return "Mobs.Prisoner"
  }

  getType() {
    return Protocol.definition().MobType.Prisoner
  }


}

module.exports = Prisoner

