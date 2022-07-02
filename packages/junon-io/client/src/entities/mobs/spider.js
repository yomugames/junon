const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Spider extends LandMob {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "spider.png"
  }

  animateEquipment() {
    let targetPosition = this.getMeleeTarget()
    this.attackTween = this.getMeleeChargeTween(targetPosition)
    this.attackTween.start()
  }


  getConstantsTable() {
    return "Mobs.Spider"
  }

  getType() {
    return Protocol.definition().MobType.Spider
  }


}

module.exports = Spider

