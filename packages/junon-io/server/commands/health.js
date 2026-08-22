const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Health extends BaseCommand {
  getUsage() {
    return [
      "Sets the health of an entity to a certain value",
      "/health set [player|entity_id] [amount]",
      "/health gain [player|entity_id] [amount]",
      "/health lose [player|entity_id] [amount]",
      "ex: /health set kuroro 100",
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let subcommand = args[0]

    const selector = args[1]
    let targetEntities = this.getEntitiesBySelector(selector)
    if (targetEntities.length === 0) {
      caller.showChatError("No such entity: " + selector)
      return
    }

    const amount = parseInt(args[2])
    if (isNaN(amount)) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    if (amount < 0 || amount > (2**32)/2) {
      caller.showChatError("Invalid amount: " + amount)
      return
    }

    switch(subcommand) {
      case "set":
        targetEntities.forEach((entity) => {
          entity.setHealth(amount)
        })
        break
      case "gain":
        targetEntities.forEach((entity) => {
          entity.setHealth(entity.getHealth() + amount)
        })
        break
      case "lose":
        targetEntities.forEach((entity) => {
          entity.setHealth(entity.getHealth() - amount)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Health