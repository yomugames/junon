const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class God extends BaseCommand {
  getUsage() {
    return [
      "/god",
      "/god [player]"
    ]
  }

  isArgumentRequired() {
    return false
  }

  allowOwnerOnly() {
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
        this.toggleGod(player)
      })
    } else {
      if (caller.isPlayer()) {
        this.toggleGod(caller)
      }
    }
  }

  toggleGod(player) {
    player.godMode = !player.godMode
    if (player.godMode) {
      player.setHealth(player.getMaxHealth())
    }

    player.showChatSuccess("god mode: " + (player.godMode ? "ON" : "OFF" ))
  }
}

module.exports = God





