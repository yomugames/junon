const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class ClearInv extends BaseCommand {
  getUsage() {
    return [
      "/clearinv",
      "/clearinv [player]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]

    if (!selector) {
      player.clearInventoryOnly()
      return
    }

    let targetPlayers = this.getPlayersBySelector(selector) 
    targetPlayers.forEach((targetPlayer) => {
      targetPlayer.clearInventoryOnly()
    })
  }

  isArgumentRequired() {
    return false
  }

}

module.exports = ClearInv
