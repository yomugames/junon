const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Gold extends BaseCommand {
  getUsage() {
    return [
      "/gold set [player] [amount]",
      "/gold gain [player] [amount]",
      "/gold lose [player] [amount]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let subcommand = args[0]

    const username = args[1]
    let targetPlayers = this.getPlayersBySelector(username)
    if (targetPlayers.length === 0) {
      caller.showChatError("No such player: " + username)
      return
    }

    const amount = parseInt(args[2])
    if (isNaN(amount)) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    if (amount < 0 || amount > (2**32)/2) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    switch(subcommand) {
      case "set":
        targetPlayers.forEach((targetPlayer) => {
          targetPlayer.setGold(amount)
        })
        break
      case "gain":
        targetPlayers.forEach((targetPlayer) => {
          targetPlayer.increaseGold(amount)
        })
        break
      case "lose":
        targetPlayers.forEach((targetPlayer) => {
          targetPlayer.reduceGold(amount)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Gold