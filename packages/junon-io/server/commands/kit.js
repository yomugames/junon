const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Kit extends BaseCommand {

  getUsage() {
    return [
      "/kit list",
      "/kit show [name]",
      "/kit create [name]",
      "/kit delete [name]",
      "/kit rename [name] [newname]",
      "/kit give [player] [name]",
      "/kit give [role] [name]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let validSubcommands = ["list", "create", "show", "delete", "add", "give", "rename"]

    let name
    let success

    let subcommand = args[0]

    switch(subcommand) {
      case "list":
        let kitNames = Object.keys(this.game.kits)
        if (kitNames.length === 0) {
          player.showChatSuccess("No kits")
        } else {
          player.showChatSuccess(kitNames.join(", "))
        }
        
        break
      case "show":
        name = args[1]
        if (!name) {
          return player.showChatError("/kit show [name]")
        }

        let kit = this.game.getKit(name)
        if (!kit) {
          return player.showChatError("no such kit")
        }

        player.showChatSuccess(kit.prettyPrint())
        break
      case "create":
        name = args[1]
        if (!name) {
          return player.showChatError("/kit create [name]")
        }

        if (this.game.hasKit(name)) {
          return player.showChatError("kit name already taken")
        }

        success = this.game.createKit(name, { inventory: player.inventory })
        if (success) {
          player.showChatSuccess("kit " + name + " created")
        }
        
        break
      case "delete":
        name = args[1]
        if (!name) {
          return player.showChatError("/kit delete [name]")
        }

        success = this.game.deleteKit(name)
        if (success) {
          return player.showChatSuccess("kit " + name + " removed")
        }
        break
      case "add":
        break
      case "rename":
        name = args[1]
        let newName = args[2]
        if (!name || !newName) {
          return player.showChatError("/kit rename [name] [newname]")
        }

        success = this.game.renameKit(name, newName)
        if (success) {
          return player.showChatError("kit renamed")
        }
        break
      case "give":
        name = args[2]
        if (!name) return

        let roleName   = args[1]
        let role = this.game.getCreatorTeam() && this.game.getCreatorTeam().getRoleByName(roleName)
        if (role) {
          this.game.giveKitToRole(name, role)
          player.showChatSuccess(`${name} assigned to role ${role.name}`)
          return
        }

        let playerName = args[1]
        let targetPlayer = this.game.getPlayerByName(playerName)
        if (!targetPlayer) {
          player.showChatError("No such player " + playerName)
          return
        }

        this.game.giveKit(name, targetPlayer)
        player.showChatSuccess(`Kit given to player ${targetPlayer.name}`)
        break
      default: 
        player.showChatError("No such subcommand /kit " + subcommand)
        break
    }
  }

}

module.exports = Kit
