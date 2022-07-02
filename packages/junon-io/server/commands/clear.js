const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Clear extends BaseCommand {
  getUsage() {
    return [
      "/clear",
      "/clear [player]",
      "/clear [player] [item]",
      "/clear [player] [item] [amount]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]
    let itemName
    let amount

    let entities = this.getEntitiesBySelector(selector) 
    if (entities.length === 0) {
      if (player.isPlayer()) {
        itemName = this.sector.klassifySnakeCase(args[0])
        amount = args[1]

        player.clearInventory({
          itemName: itemName,
          count: amount
        })
        return
      }
    } else {
      // has selector entities
      
      itemName = this.sector.klassifySnakeCase(args[1])
      amount = args[2]

      let entities = this.getEntitiesBySelector(selector) 
      entities.forEach((entity) => {
        if (entity.isPlayer()) {
          entity.clearInventory({
            itemName: itemName,
            count: amount
          })
        } else if (entity.isBuilding() && entity.hasStorage()) {
          entity.clearStorage({
            itemName: itemName,
            count: amount
          })
        }
      })
    }
  }

  isArgumentRequired() {
    return false
  }

}

module.exports = Clear
