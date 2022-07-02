const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Setting extends BaseCommand {
  getUsage() {
    return [
      "/setting [key] [value]",
      "i.e. /setting isChatEnabled false",
      "Guide: https://pastebin.com/raw/4jsmPjws"
    ]
  }

  isArgumentRequired() {
    return true
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let key = args[0]
    let value = args[1]

    if (key === 'buildSpeed') {
      value = parseInt(value)
      if (value > 0 && value <= 5) {
        this.sector.setBuildSpeed(value)
        player.showChatSuccess("buildSpeed set to " + value)
      }
      return
    }

    if (key === 'miningSpeed') {
      value = parseInt(value)
      if (value > 0 && value <= 5) {
        this.sector.setMiningSpeed(value)
        player.showChatSuccess("miningSpeed set to " + value)
      }
      return
    }

    if (!this.sector.settings[key]) {
      player.showChatError("invalid key. Valid keys are: " + Object.keys(this.sector.settings).join(", "))
      return
    }

    if (["true", "false"].indexOf(value) === -1) {
      player.showChatError("invalid value. true/false accepted only")
      return
    }

    if (value === 'true') value = true
    if (value === 'false') value = false

    this.sector.editSetting(key, value)
    player.showChatSuccess(key + " set to " + value)
  }

}

module.exports = Setting
