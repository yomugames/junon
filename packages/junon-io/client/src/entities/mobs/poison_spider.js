const Spider = require('./spider')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PoisonSpider extends Spider {
  getSpritePath() {
    return "poison_spider.png"
  }

  addDizzyEyes(targetSprite) {
    super.addDizzyEyes(targetSprite)

    this.dizzySprite.width = 16
    this.dizzySprite.height = 6
    this.dizzySprite.position.y = -8
  }


  getConstantsTable() {
    return "Mobs.PoisonSpider"
  }

  getType() {
    return Protocol.definition().MobType.PoisonSpider
  }

  getWidth() {
    return 72
  }

  getHeight() {
    return 48
  }

}

module.exports = PoisonSpider
