const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Destroy extends BaseCommand {
  getUsage() {
    return [
      "/destroy [entity_id]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isEnabled() {
    return false
  }

  perform(player, args) {
    const selector = args[0]

    let entities = this.getEntitiesBySelector(selector)
    if (entities.length === 0) {
      player.showChatError("Invalid entityId " + selector)

      return
    }

    entities.forEach((entity) => {
      if (entity.isMob() || entity.isBuilding() || entity.isCorpse()) {
        entity.remove()
      }
    })
  }

}

module.exports = Destroy
