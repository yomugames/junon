const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Hour extends BaseCommand {
  getUsage() {
    return [
      "/hour",
    ]
  }

  isEnabled() {
    return true
  }
  
  isArgumentRequired() {
    return false
  }
  
  perform(player, args) {
    player.showChatSuccess(player.sector.getHour())
  }

}

module.exports = Hour