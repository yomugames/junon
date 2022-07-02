const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Level extends BaseCommand {
  getUsage() {
    return [
      "/level set [entity_id] [amount]",
      "/level gain [entity_id] [amount]",
      "/level lose [entity_id] [amount]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isEnabled() {
    return false
  }

  perform(caller, args) {
    let subcommand = args[0]

    const entityId = args[1]
    let entity = this.game.getEntity(entityId)
    if (!entity) {
      caller.showChatError("No such entity: " + entityId)
      return
    }

    if (!entity.isMob() && !entity.isBuilding()) {
      caller.showChatError("No such entity: " + entityId)
      return
    }

    const amount = parseInt(args[2])
    if (isNaN(amount)) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    if (amount < 0 || amount > 99) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    switch(subcommand) {
      case "set":
        entity.setLevel(amount)
        break
      case "gain":
        entity.setLevel(entity.level + amount)
        break
      case "lose":
        let newLevel = entity.level - amount
        if (newLevel < 0) newLevel = 0
        entity.setLevel(newLevel)
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Level