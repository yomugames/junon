const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Role extends BaseCommand {
  getUsage() {
    return [
      "/role [player] [rolename]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
    return true
  }

  perform(player, args) {
    let selector = args[0]

    let targetPlayers = this.getPlayersBySelector(selector)
    if (targetPlayers.length === 0) {
      player.showChatError("No such player ")
      return
    }

    let roleName = args[1] 
    if (!roleName) {
      player.showChatError("/role [player] [rolename]")
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      let role = targetPlayer.getTeam().getRoleByName(roleName)
      if (!role) {
        player.showChatError("No such role " + roleName)
        return
      }

      targetPlayer.setRoleType(role.id)
    })
  }
}

module.exports = Role

