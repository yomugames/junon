const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Unmute extends BaseCommand {
  getUsage() {
    return [
      "Grants back the ability to chat to a player",
      "/unmute [player]",
      "ex: /unmute kuroro"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const selector = args[0]

    let players = this.getPlayersBySelector(selector)

    players.forEach((player) => {
      player.unmute()
      player.showChatSuccess("You have been unmuted")
      caller.showChatSuccess(player.getName() + " has been unmuted")
    })    
  }
}

module.exports = Unmute
