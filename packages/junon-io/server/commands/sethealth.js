const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class SetHealth extends BaseCommand {
  getUsage() {
    return [
      "/sethealth [entity_id] [health]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]
    const health = parseInt(args[1])

    if (isNaN(health)) {
      player.showChatError("Invalid health " + health)
      return
    }

    let entities = this.getEntitiesBySelector(selector)
    if (entities.length === 0) {
      player.showChatError("Invalid entityId " + selector)

      return
    }

    entities.forEach((entity) => {
      if (entity.isDestroyable()) {
        if (health > entity.getMaxHealth()) {
          this.game.executeCommand(this.game.sector, `/stat ${entity.id} health:${health}`)
          entity.setHealth(health)
        } else {
          entity.setHealth(health)
        }
      }
    })

  }

}

module.exports = SetHealth
