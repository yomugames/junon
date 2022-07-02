const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const xss = require("xss")

class Sidebar extends BaseCommand {

  getUsage() {
    return [
      "/sidebar clear",
      "/sidebar set [row] [text]",
      "/sidebar set [row] @scoreboard",
      "/sidebar [player] clear",
      "/sidebar [player] set [row] [text]",
      "/sidebar unset @scoreboard"
    ]
  }

  perform(caller, args) {
    let selector = args[0]
    let subcommand
    let text

    let targetPlayers = this.getPlayersBySelector(selector)
    if (targetPlayers.length === 0) {
      subcommand = args[0]
      this.performSidebarCommand(caller, subcommand, args.slice(1), null)
      return
    }

    subcommand = args[1]

    this.performSidebarCommand(caller, subcommand, args.slice(2), targetPlayers)
  }

  performSidebarCommand(caller, subcommand, args, targetPlayers) {
    let globalSidebarId = 0
    let text

    let row
    switch(subcommand) {
      case "clear":
        if (!targetPlayers) {
          this.game.clearSidebar(globalSidebarId)
        } else {
          targetPlayers.forEach((player) => {
            this.game.clearSidebar(player.getId())
          })
        }
        break
      case "set":
        row = parseInt(args[0])
        let isRowInvalid = (row < 0 || row > 15) || isNaN(row)
        if (isRowInvalid) {
          caller.showChatError("invalid row")
          return
        }

        text = args.slice(1).join(" ") || ""
        text = xss(text)
        
        if (text === "@scoreboard") {
          this.game.enableGlobalScoreboard(row)
        } else if (text === "@teamscoreboard") {
          this.game.enableGlobalScoreboard(row, { teams: true })
        } else if (!targetPlayers) {
          this.sector.bufferSidebarText(globalSidebarId, { row: row, text: text })
        } else {
          targetPlayers.forEach((player) => {
            this.sector.bufferSidebarText(player.getId(), { row: row, text: text })
          })
        }

        break
      case "unset":
        text = args[0]
        if (text === "@scoreboard" || text === "@teamscoreboard") {
          this.game.hideGlobalScoreboard()
        }

        break
      default:
        caller.showChatError("No such subcommand /sidebar " + subcommand)
    }
  }

  allowOwnerOnly() {
    return true
  }
}

module.exports = Sidebar
