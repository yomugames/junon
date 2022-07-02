const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Playsound extends BaseCommand {

  getUsage() {
    return [
      "/playsound [soundname]",
    ]
  }

  // isEnabled() {
  //   return false
  // }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let soundName = this.sector.klassifySnakeCase(args[0] || "")
    let soundId = Protocol.definition().SoundType[soundName]
    if (!soundId) {
      player.showChatError("Sound not available")
      return
    }

    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "PlaySound", { id: soundId } )
    })
  }

}

module.exports = Playsound
