const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Spectate extends BaseCommand {
  getUsage() {
    return [
      "/spectate",
      "/spectate [player]"
    ]
  }

  isArgumentRequired() {
    return false
  }

  isNonSandboxCommand() {
    return true
  }

  perform(caller, args) {
    const selector = args[0]
    if (selector) {
      if (!caller.isSectorOwner()) {
        caller.showChatError("permission denied")
        return
      }

      let targetPlayers = this.getPlayersBySelector(selector) 
      if (targetPlayers.length === 0) {
        caller.showChatError("no players found")
        return
      }

      targetPlayers.forEach((player) => {
        this.toggleSpectate(player)
      })
    } else {
      if (caller.isPlayer()) {
        this.toggleSpectate(caller)
      }
    }
    
  }

  toggleSpectate(player) {
    if (player.ghost) {
      player.possess(player)
      player.showChatSuccess("spectate mode: OFF")
    } else {
      player.transformIntoGhost()
      player.showChatSuccess("spectate mode: ON")
    }
  }
}

module.exports = Spectate




