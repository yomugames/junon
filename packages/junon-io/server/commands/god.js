const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class God extends BaseCommand {
  getUsage() {
    return [
      "/god",
      "/god [on|off]",
      "/god [player]",
      "/god [player] [on|off]"
    ]
  }

  isArgumentRequired() {
    return false
  }

  allowOwnerOnly() {
    return true
  }


  perform(caller, args) {
    let state = null
    if (args.length > 0) {
      const lastArg = args[args.length - 1].toLowerCase()
      if (lastArg === "on" || lastArg === "off") {
        state = lastArg
        args = args.slice(0, -1)
      }
    }

    const selector = args[0]
    let targetPlayers = this.getPlayersBySelector(selector)

    if (targetPlayers.length === 0 && caller.isPlayer()) {
      targetPlayers = [caller]
    }

    if (targetPlayers.length === 0 && selector) {
        caller.showChatError("no players found")
        return
    }

    targetPlayers.forEach(targetPlayer => {
        const shouldEnable = state === null ? !targetPlayer.godMode : (state === "on")
        this.setGod(targetPlayer, shouldEnable)
    })
  }

  setGod(player, enabled) {
    if (player.godMode === enabled) return

    player.godMode = enabled
    if (player.godMode) {
      player.setHealth(player.getMaxHealth())
    }

    player.showChatSuccess("god mode: " + (player.godMode ? "ON" : "OFF" ))
  }
}

module.exports = God