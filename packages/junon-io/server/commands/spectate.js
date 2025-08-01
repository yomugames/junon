const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Spectate extends BaseCommand {
  getUsage() {
    return [
      "/spectate",
      "/spectate [on|off]",
      "/spectate [player]",
      "/spectate [player] [on|off]"
    ]
  }

  isArgumentRequired() {
    return false
  }

  isNonSandboxCommand() {
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
    
    if (selector) {
      if (!caller.isAdminMode && !this.game.isPeaceful()) {
        return
      }

      const hasPermission = caller.isAdminMode || caller.isSectorOwner() || caller.hasCommandsPermission()
      if (!hasPermission) {
        return
      }
    }

    let targetPlayers = this.getPlayersBySelector(selector)

    if (targetPlayers.length === 0 && caller.isPlayer()) {
      targetPlayers = [caller]
    }

    if (targetPlayers.length === 0 && selector) {
      caller.showChatError("no players found")
      return
    }

    targetPlayers.forEach(targetPlayer => {
      const isSpectating = !!targetPlayer.ghost
      const shouldEnable = state === null ? !isSpectating : (state === "on")
      this.setSpectate(targetPlayer, shouldEnable)
    })
  }

  setSpectate(player, enabled) {
    const isSpectating = !!player.ghost
    if (isSpectating === enabled) return

    if (enabled) {
      player.transformIntoGhost()
      player.showChatSuccess("spectate mode: ON")
    } else {
      player.possess(player)
      player.showChatSuccess("spectate mode: OFF")
    }
  }
}

module.exports = Spectate