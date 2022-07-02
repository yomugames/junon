const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class SetOwner extends BaseCommand {
  getUsage() {
    return [
      "/setowner [entity_id] [team]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]
    const teamName = args[1] ? args.slice(1).join(" ") : ""

    let team = this.game.getTeamByName(teamName)
    if (teamName && !team) {
      player.showChatError("No such team " + teamName)
      return
    }

    let entities = this.getEntitiesBySelector(selector)
    if (entities.length === 0) {
      player.showChatError("Invalid entityId " + selector)

      return
    }

    entities.forEach((entity) => {
      entity.setOwner(team)
    })

  }

}

module.exports = SetOwner
