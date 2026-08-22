const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class God extends BaseCommand {
  getUsage() {
    return [
      "Enables or disables god state for players",
      "/god",
      "/god [player]",
      "/god [player] [true/false]",
      "ex: /god kuroro"
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
    let godPar = args[1]

    if ((godPar !== "false") && (godPar !== "true") && (godPar !== null)) {
      godPar = null
    }

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
          this.toggleGod(player,godPar)
      })
    } else {
      if (caller.isPlayer()) { 
          this.toggleGod(caller,godPar)
      }
    }
  }

  toggleGod(player,tostate) {

    if (tostate) {
      if (tostate == "true") {
        player.godMode = true
      } else {
        player.godMode = false
      }
    } else { 
      player.godMode = !player.godMode
    }

    if (player.godMode) {
      player.setHealth(player.getMaxHealth())
    }
    player.showChatSuccess("god mode: " + (player.godMode ? "ON" : "OFF" ))
  }
}

module.exports = God





