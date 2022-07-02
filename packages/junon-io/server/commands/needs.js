const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const SocketUtil = require("junon-common/socket_util")
const Protocol = require('../../common/util/protocol')

class Needs extends BaseCommand {

  getUsage() {
    return [
      "/needs list",
      "/needs assign [entity_id] [type]",
      "/needs remove [entity_id]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    let text
    let entityId

    switch(subcommand) {
      case "list":
        let needs = this.game.getNeeds()
        if (Object.keys(needs).length === 0) {
          player.showChatSuccess("No needs")
        } else {
          let result = ""
          for (let mobId in needs) {
            let need = needs[mobId]
            result += [mobId, need].join(":")
          }

          player.showChatSuccess(result)
        }
        break
      case "remove":
        entityId = args[1]
        this.game.removeNeed(entityId)
        break
      case "assign":
        entityId = args[1]
        let entity = this.game.getEntity(entityId)
        if (!entity) {
          player.showChatError("No such mob id: " + entityId)
          return
        }

        if (!entity.isMob()) {
          player.showChatError("Not a mob: " + entityId)
          return
        }

        let type = args[2] || ""
        type = this.sector.klassifySnakeCase(type)

        let typeId = Protocol.definition().BuildingType[type]
        if (!typeId) {
          player.showChatError("No such item: " + type)
          return
        }

        this.game.assignNeed(entityId, typeId)
        break
      default:
        player.showChatError("No such subcommand /needs " + subcommand)
    }


  }

}

module.exports = Needs