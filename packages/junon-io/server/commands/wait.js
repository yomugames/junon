const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Wait extends BaseCommand {
  getUsage() {
    return [
      "Waits a set amount of seconds in the command block to run the next line of commands",
      "/wait [seconds]",
      "ex: /wait 5"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isDelayable() {
    return false
  }

  perform(caller, args) {
    let seconds = parseFloat(args[0])

    if (caller && caller.isPlayer()) {
      caller.showChatError("Usable in command blocks only")
      return
    }

    if (isNaN(seconds)) {
      caller.showChatError("Invalid seconds: " + seconds)
      return
    }

    if (seconds < 0 || seconds > (2**32)/2) {
      caller.showChatError("Invalid seconds: " + seconds)
      return
    }

    this.sector.eventHandler.delayNextCommands(seconds)
  }
}

module.exports = Wait

