const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")
const Helper = require("../../common/helper")
const Mobs = require("../entities/mobs/index")
const Buildings = require("../entities/buildings/index")
const { toNumber } = require("lodash")

class Name extends BaseCommand {

  getUsage() {
    return [
      "Sets a name to an entity",
      "/name [entity_id]",
      "/name set [entity_id] [text]",
      "/name setcolor [entity_id] [hex_color]",
      "/name setsize [entity_id] [size:1-50]",
      "/name remove [entity_id]",
      "ex: /name set 1234 Welcome!"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  cleanName(text) {
    let newText = this.game.sanitize(text)
    return newText.substring(0,30)
  }

  convertHexToPixiColor(hexString) {
    const cleanHex = hexString.replace("#", "").replace("0x", "").trim();  
    return parseInt(cleanHex, 16);
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
      case "setcolor":
        entity.setNameColor(this.convertHexToPixiColor(args[2])||16777215)
        break;
      case "setsize":
        entity.setNameSize(toNumber(args[2]))
      default:
        break
    }
  }

}

module.exports = Name