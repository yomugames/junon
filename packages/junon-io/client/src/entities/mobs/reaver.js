const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Reaver extends BaseMob {

  constructor(game, data) {
    super(game, data)

    this.characterSprite.tint = 0x2e482e // green
  }

  getSpritePath() {
    return "player_body.png"
  }


  getConstantsTable() {
    return "Mobs.Reaver"
  }

  getType() {
    return Protocol.definition().MobType.Reaver
  }


}

module.exports = Reaver
