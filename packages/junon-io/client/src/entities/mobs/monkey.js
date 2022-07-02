const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Monkey extends LandMob {
  constructor(game, data) {
    super(game, data)

  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  getSpritePath() {
    return "monkey.png"
  }

  getConstantsTable() {
    return "Mobs.Monkey"
  }

  getType() {
    return Protocol.definition().MobType.Monkey
  }


}

module.exports = Monkey
