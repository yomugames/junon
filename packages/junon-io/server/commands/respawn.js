const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Respawn extends BaseCommand {
  getUsage() {
    return [
      "/respawn [player]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let selector = args[0]

    let targetPlayers = this.getPlayersBySelector(selector)
    if (targetPlayers.length === 0) {
      player.showChatError("No such player ")
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      if (targetPlayer.health > 0) {
        targetPlayer.respawn()
      }
    })

  }
}

module.exports = Respawn

