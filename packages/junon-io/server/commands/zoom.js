const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Zoom extends BaseCommand {
  getUsage() {
    return [
      "Sets the camera zoom of a player",
      "/zoom set [player] [amount]",
      "/zoom gain [player] [amount]",
      "/zoom lose [player] [amount]",
      "ex: /zoom set kuroro 3",
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

    const amount = Number(args[2])
    if (!Number.isFinite(amount)) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    if (amount <= 0 || amount > 15) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    switch(subcommand) {
      case "set":
        targetPlayers.forEach((player) => {
          player.setCameraZoom(amount)
        })
        break
      case "gain":
        targetPlayers.forEach((player) => {
          player.setCameraZoom(player.getCameraZoom() + amount)
        })
        break
      case "lose":
        targetPlayers.forEach((player) => {
          player.setCameraZoom(player.getCameraZoom() - amount)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Zoom