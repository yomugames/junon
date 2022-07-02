const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Flow extends BaseCommand {
  getUsage() {
    return [
      "/flow [entity_id]",
    ]
  }

  perform(player, args) {
    const entityId = args[0]
    let entity = this.game.getEntity(entityId)
    if (!entity) return

    let flowField = this.sector.pathFinder.flowFields[entityId]

    if (!flowField) {
      flowField = this.sector.pathFinder.getFlowFieldToReachSameChunkRegion(entity)
    }

    if (flowField) {
      this.sector.pathFinder.addFlowSubscription(flowField, player)
      this.getSocketUtil().emit(player.getSocket(), "FlowField", flowField.toJson())
    }
  }

  isEnabled() {
    return false
  }

}

module.exports = Flow



