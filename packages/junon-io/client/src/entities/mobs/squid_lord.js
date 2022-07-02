const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SquidLord extends BaseMob {

  onPostInit() {
    super.onPostInit()
// 
//     this.rangeSprite = this.getRangeSprite()
//     this.sprite.addChildAt(this.rangeSprite, 0)
  }

//   drawRange() {
//     this.rangeSprite.alpha = 0.1
//   }
// 
//   hideRange() {
//     this.rangeSprite.alpha = 0
//   }
// 
//   onMouseOver() {
//     super.onMouseOver()
//     this.drawRange()
//   }
// 
//   onMouseOut() {
//     super.onMouseOut()
//     this.hideRange()
//   }

  getSpritePath() {
    return "squid_lord.png"
  }

  getConstantsTable() {
    return "Mobs.SquidLord"
  }

  getType() {
    return Protocol.definition().MobType.SquidLord
  }


}

module.exports = SquidLord
