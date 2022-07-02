const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Kick extends BaseCommand {

  getUsage() {
    return [
      "/kick [player]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isArgumentRequired() {
    return true
  }

  perform(caller, args) {
    const username = args[0]

    let targetPlayer = this.game.getPlayerByName(username)
    if (!targetPlayer) {
      caller.showChatError("no such player: " + username)
      return
    }

    if (targetPlayer.isSectorOwner()) return

    let team = targetPlayer.getTeam()  
    let result = team.kick(targetPlayer.getId(), caller)
    if (result) {
      caller.showChatSuccess("kicked " + username)
    } else {
      caller.showChatError("unable to kick " + username)
    }
  }

}

module.exports = Kick