const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Brood extends LandMob {

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }

  renderDeadBody() {
    super.renderDeadBody()
    this.dizzySprite.width = 20
    this.dizzySprite.height = 10
  }

  getSpritePath() {
    return "brood.png"
  }

  getConstantsTable() {
    return "Mobs.Brood"
  }

  getType() {
    return Protocol.definition().MobType.Brood
  }


}

module.exports = Brood
