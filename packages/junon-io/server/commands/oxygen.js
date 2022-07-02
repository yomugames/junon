const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Oxygen extends BaseCommand {
  getUsage() {
    return [
      "/oxygen set [player|mob|building] [amount]",
      "/oxygen gain [player|mob|building] [amount]",
      "/oxygen lose [player|mob|building] [amount]"
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
          entity.setOxygen(amount)
        })
        break
      case "gain":
        targetEntities.forEach((entity) => {
          entity.setOxygen(entity.getOxygen() + amount)
        })
        break
      case "lose":
        targetEntities.forEach((entity) => {
          entity.setOxygen(entity.getOxygen() - amount)
        })
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Oxygen