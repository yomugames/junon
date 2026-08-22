const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Hunger extends BaseCommand {
  getUsage() {
    return [
      "Sets the hunger of an entity to a certain value",
      "/hunger set [player|entity_id] [amount]",
      "/hunger gain [player|entity_id] [amount]",
      "/hunger lose [player|entity_id] [amount]",
      "ex: /hunger set kuroro 100",
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
          entity.setHunger(amount)
        })
        break
      case "gain":
        targetEntities.forEach((entity) => {
          entity.setHunger(entity.getHunger() + amount)
        })
        break
      case "lose":
        targetEntities.forEach((entity) => {
          entity.setHunger(entity.getHunger() - amount)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Hunger