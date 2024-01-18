const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Time extends BaseCommand {
  getUsage() {
    return [
      "/time [hour]",
    ]
  }

  isEnabled() {
    return false
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    if (!debugMode) {
      this.showChatError("Command no longer available")
      return
    }

    if (!args[0]) {
      this.showChatError("/time [hour]")
      return
    }

    const hour = parseInt(args[0])
    if (isNaN(hour) || hour < 0 || hour > 23 ) {
      player.showChatError("hour must be a number from 0-23")
      return
    }

    this.sector.setTime({ player: player, hour: hour })
  }

}

module.exports = Time