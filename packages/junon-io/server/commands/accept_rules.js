const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class AcceptRules extends BaseCommand {
  perform(player, args) {
    player.acceptRules()
  }

  isArgumentRequired() {
    return false
  }

}

module.exports = AcceptRules
