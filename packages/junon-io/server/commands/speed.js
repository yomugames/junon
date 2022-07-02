const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Speed extends BaseCommand {
  getUsage() {
    return [
      "/speed [player] [1-20]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]
    const speed = parseInt(args[1])

    let targetPlayers = this.getPlayersBySelector(selector) 
    if (targetPlayers.length === 0) {
      player.showChatError("no players found")
      return
    }

    if (isNaN(speed) || speed < 0 || speed > 30) {
      player.showChatError("/speed [1-30]")
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      targetPlayer.speed = speed
    })
  }

}

module.exports = Speed