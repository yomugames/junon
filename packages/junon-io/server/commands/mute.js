const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Mute extends BaseCommand {
  getUsage() {
    return [
      "/mute [player]",
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const selector = args[0]

    let players = this.getPlayersBySelector(selector)

    players.forEach((player) => {
      if (player.canBeMuted()) {
        player.mute()
        player.showChatError("You have been muted")
        caller.showChatSuccess(player.getName() + " has been muted")
      }
    })    
  }
}

module.exports = Mute
