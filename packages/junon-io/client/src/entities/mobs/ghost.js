const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Ghost extends BaseMob {

  constructor(game, data) {
    super(game, data)

    if (this.game.player.isControllingGhost() && this.sector.isMiniGame()) {
      this.characterSprite.alpha = 0.3
    } else {
      this.characterSprite.alpha = 0
    }
  }

  onMouseOver() {
  }

  onMouseOut() {
  }

  onClick() {
    // dont allow ghost click
  }

  isHiddenFromView() {
    return true
  }

  isGhost() {
    return true
  }

  getSpritePath() {
    return "ghost.png"
  }

  getConstantsTable() {
    return "Mobs.Ghost"
  }

  getType() {
    return Protocol.definition().MobType.Ghost
  }

  onPositionChanged() {
    super.onPositionChanged()

    if (this.isMe()) {
      this.game.player.cullChunks()  
    }

  }

  animateWalkOnPlatform() {
    
  }

  isMe() {
    return this.game.player.cameraFocusTarget === this
  }


}

module.exports = Ghost
