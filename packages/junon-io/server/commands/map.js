const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const SocketUtil = require("junon-common/socket_util")

class Map extends BaseCommand {
  getUsage() {
    return [
      "/map [subcommand] [selector]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    let selector

    switch(subcommand) {
      case "regenerate":
        let maxRow = this.sector.getRowCount() - 1
        let maxCol = this.sector.getColCount() - 1
        this.game.executeCommand(this.sector, `/fill 0 0 ${maxRow} ${maxCol} sky`)
        this.game.executeCommand(this.sector, `/kill @m`)

        this.sector.mapGenerator.regenerate()

        break
      case "blink": 
        selector = args[1]
        let entities = this.getEntitiesBySelector(selector)
        if (entities.length === 0) {
          player.showChatError("Invalid selector " + selector)

          return
        }

        this.game.forEachPlayer((targetPlayer) => {
          entities.forEach((entity) => {
            SocketUtil.emit(targetPlayer.getSocket(), "MapAction", { action: "drawDamage", row: entity.getTopLeftRow(), col: entity.getTopLeftCol() })
          })
        })

        break
      default: 
        player.showChatError("No such subcommand: " + subcommand)
    }
  }
}

module.exports = Map