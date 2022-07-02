const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")
const Helper = require("../../common/helper")
const Mobs = require("../entities/mobs/index")
const Buildings = require("../entities/buildings/index")

class Name extends BaseCommand {

  getUsage() {
    return [
      "/name [entity_id]",
      "/name set [entity_id] [name]",
      "/name remove [entity_id]",
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  cleanName(text) {
    let newText = this.game.sanitize(text)
    return newText.substring(0,30)
  }

  perform(caller, args) {
    let entityId
    let name 
    let entity

    if (args.length === 1) {
      //read only
      entityId = args[0]
      entity = this.game.getEntity(entityId)
      if (!entity) {
        caller.showChatError("No such entity: " + entityId)
        return
      }

      if (!entity.isMob() && !entity.isBuilding()) {
        caller.showChatError("No such entity: " + entityId)
        return
      }

      caller.showChatSuccess(entity.getName())
      return
    } 

    let subcommand = args[0]

    entityId = args[1]
    entity = this.game.getEntity(entityId)
    if (!entity) {
      caller.showChatError("No such entity: " + entityId)
      return
    }

    if (!entity.isMob() && !entity.isBuilding()) {
      caller.showChatError("No such entity: " + entityId)
      return
    }

    switch(subcommand) {
      case "set":
        name = args.slice(2).join(" ")
        name = this.cleanName(name)
        entity.setName(name)
        caller.showChatSuccess(entity.getName())
        break
      case "remove":
        entity.setName("")
        caller.showChatSuccess("removed name from " + entity.id)
        break
      default:
        break
    }
  }

}

module.exports = Name