const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Fly extends BaseCommand {

  getUsage() {
    return [
      "Enables or disables fly state for players",
      "/fly",
      "/fly [player]",
      "/fly [player] [true/false]",
      "ex: /fly kuroro"
    ]
  }

  isArgumentRequired() {
    return false
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const username = args[0]
    let nextState = args[1]

    if ((nextState !== "true") && (nextState !== "false") && (nextState !== null)) {
      nextState = null
    }

    let targetPlayers = this.getPlayersBySelector(username)
    if (targetPlayers.length === 0) {
      if (player.isPlayer()) {
        player.toggleFly(nextState)
      }
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      targetPlayer.toggleFly(nextState)
    })
  }

}

module.exports = Fly