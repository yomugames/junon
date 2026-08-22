const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Force extends BaseCommand {
  getUsage() {
    return [
      "Creates a force for an entity that pushes them in the set direction",
      "/force [player|entity_id] [x] [y]",
      "ex: /force kuroro -5 -5"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let entityName = args[0]
    let entity = this.game.getEntityByNameOrId(entityName)
    if (!entity) {
      player.showChatError("No such entity " + entityName)
      return
    }

    let x = parseInt(args[1])
    let y = parseInt(args[2])

    if (isNaN(x) || isNaN(y)) {
      player.showChatError("Invalid x or y value for force ")
      return
    }

    let maxVelocity = 3000
    if (Math.abs(x) > maxVelocity || Math.abs(y) > maxVelocity) {
      player.showChatError("cannot exceed max force of " + maxVelocity)
      return
    }

    if (!entity.enableCustomVelocity) return
      
    entity.enableCustomVelocity()
    entity.applyForce([x, y])
    // targetPlayer.applySpeedLimit()

  }
}

module.exports = Force

