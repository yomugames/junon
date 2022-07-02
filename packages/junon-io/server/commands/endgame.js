const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class EndGame extends BaseCommand {
  getUsage() {
    return [
      "/endgame [player]"
    ]
  }

  isEnabled() {
    return false
  }

  perform(player, args) {
    let playerName = args[0]

    let targetPlayer = this.game.getPlayerByName(playerName)
    if (!targetPlayer) {
      player.showChatError("no such player")
      return 
    }

    this.game.endGame(targetPlayer)
  }
}

module.exports = EndGame

