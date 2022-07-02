const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Score extends BaseCommand {
  getUsage() {
    return [
      "/score set [player] [amount]",
      "/score gain [player] [amount]",
      "/score lose [player] [amount]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let subcommand = args[0]
    const username = args[1]
    const amount = parseInt(args[2])

    let targetPlayers = this.getPlayersBySelector(username)
    if (targetPlayers.length === 0) {
      caller.showChatError("No such player: " + username)
      return
    }

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
          targetPlayer.setScore(amount)
          caller.showChatSuccess(`${targetPlayer.name} score set to ${amount}`)
        })
        break
      case "gain":
        targetPlayers.forEach((targetPlayer) => {
          targetPlayer.increaseScore(amount)
          caller.showChatSuccess(`${targetPlayer.name} score increased by ${amount}`)
        })
        break
      case "lose":
        targetPlayers.forEach((targetPlayer) => {
          targetPlayer.reduceScore(amount)
          caller.showChatSuccess(`${targetPlayer.name} score reduced by ${amount}`)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }



  }

}

module.exports = Score
