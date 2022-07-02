const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Item = require("../entities/item")

class Give extends BaseCommand {
  getUsage() {
    return [
      "/give [username|entity_id] [type] [count]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]

    let typeName = args[1] || ""
    typeName = this.sector.klassifySnakeCase(typeName)

    const count = parseInt(args[2] || 1)
    if (isNaN(count)) {
      player.showChatError("Invalid count")
      return
    }

    let klass = Item.getKlassByName(typeName)
    if (!klass) {
      player.showChatError("No such item: " + typeName)
      return
    }

    let targetEntities = this.getEntitiesBySelector(selector)
    if (targetEntities.length === 0) {
      player.showChatError("No such player: " + selector)
      return
    }

    targetEntities.forEach((targetEntity) => {
      if (targetEntity.isPlayer()) {
        this.sector.giveToStorage(targetEntity.inventory, klass.prototype.getType(), count)
      } else if (targetEntity.isBuilding() && targetEntity.hasStorage()) {
        this.sector.giveToStorage(targetEntity, klass.prototype.getType(), count)
      }
    })

  }

}

module.exports = Give
