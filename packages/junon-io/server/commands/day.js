const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Day extends BaseCommand {
  getUsage() {
    return [
      "/day",
    ]
  }

  isEnabled() {
    return true
  }

  isArgumentRequired() {
    return false
  }

  
  perform(player, args) {
    player.showChatSuccess(player.sector.getDayCount())
  }

}

module.exports = Day