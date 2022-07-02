const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Fly extends BaseCommand {

  getUsage() {
    return [
      "/fly",
      "/fly [player]"
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

    let targetPlayers = this.getPlayersBySelector(username)
    if (targetPlayers.length === 0) {
      if (player.isPlayer()) {
        player.toggleFly()
      }
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      targetPlayer.toggleFly()
    })
  }

}

module.exports = Fly