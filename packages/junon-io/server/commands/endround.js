const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class EndRound extends BaseCommand {

  getUsage() {
    return [
      "/endround"
    ]
  }

  isArgumentRequired() {
    return false
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    if (!this.game.isMiniGame()) {
      caller.showChatError("command only works on minigames")
      return
    }

    this.game.sector.eventHandler.endRound()
  }

}

module.exports = EndRound