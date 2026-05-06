const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Ban extends BaseCommand {

  getUsage() {
    return [
      "/ban [player]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
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
    let result = team.ban(targetPlayer.getId(), caller)
    if (result) {
      caller.showChatSuccess("banned " + username)
    } else {
      caller.showChatError("unable to ban " + username)
    }
  }

}

module.exports = Ban