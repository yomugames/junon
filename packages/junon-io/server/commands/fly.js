const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Fly extends BaseCommand {

  getUsage() {
    return [
      "/fly",
      "/fly [on|off]",
      "/fly [player]",
      "/fly [player] [on|off]"
    ]
  }

  isArgumentRequired() {
    return false
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
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

    if (targetPlayers.length === 0 && player.isPlayer()) {
      targetPlayers = [player]
    }

    if (targetPlayers.length === 0 && selector) {
      player.showChatError("no players found")
      return
    }

    targetPlayers.forEach(targetPlayer => {
      const shouldEnable = state === null ? !targetPlayer.isFlying : (state === "on")
      this.setFly(targetPlayer, shouldEnable)
    })
  }

  setFly(player, enabled) {
    if (player.isFlying === enabled) return
    player.toggleFly()
  }
}

module.exports = Fly