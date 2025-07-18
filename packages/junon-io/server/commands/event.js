const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Event extends BaseCommand {

  getUsage() {
    return [
      "/event [eventname]",
      "/event [eventname] [row] [col]",
      `ex: ${this.getValidEvents().join(", ")}` 
    ]
  }

  getValidEvents() {
    return ["meteor", "spider", "raid", "raid_end", "ice_meteor"] 
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let options = { player: player }


    const eventName = args[0]
    if (args[1] && args[2]) {
      options.row = parseInt(args[1])
      options.col = parseInt(args[2])

      if (isNaN(options.row) || isNaN(options.col)) return
      if (this.sector.isOutOfBounds(options.row, options.col)) {
        player.showChatError("out of bounds")
        return
      }
    }

    switch(eventName) {
      case "spider":
        this.sector.createSpiderEvent(options)
        break
      case "meteor":
        this.sector.createMeteorEvent(options)
        break
      case "raid":
        this.game.eventManager.createRaid(player.getTeam(), options)
        break
      case "raid_end":
        this.game.eventManager.stopRaids()
        break
      case "alarm_end":
        this.game.forEachPlayer((player) => {
          this.game.eventManager.emitEvent(player, "AlarmEnd")
        })
        break
      case "fix_lights_end":
        this.game.forEachPlayer((player) => {
          this.game.eventManager.emitEvent(player, "FixLightsEnd")
        })
        break
      default:
        if (eventName) {
          this.game.eventManager.emitEvent(player, eventName)
       case "ice_meteor":
        this.sector.createIceMeteorEvent(options)
        break
        }
    }
  }

}

module.exports = Event
