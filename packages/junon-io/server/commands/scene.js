const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Scene extends BaseCommand {
  getUsage() {
    return [
      "/scene play [sceneName] camera:[entityid]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    if (subcommand === 'play') {
      let sceneName = args[1]
      if (!this.game.hasScene(sceneName)) {
        player.showChatError("no such scene")
        player.showChatError("- - - - - - - -")
        player.showChatError("Possible Scenes:")
        player.showChatError("VotingSkipped")
        player.showChatError("EjectImpostor")
        player.showChatError("EmergencyMeeting")
        player.showChatError("StationExplode")
        player.showChatError("StarmancerTDMobSpawn")
        player.showChatError("StarmancerTDProtectCore")
        player.showChatError("BurnImpostor")
        return
      }

      let keyValueArgs = args.slice(2)
      let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)

      if (keyValueMap) {
        this.game.playScene(sceneName, keyValueMap)
      } else {
        this.game.playScene(sceneName)
      }
    }

  }
}

module.exports = Scene

