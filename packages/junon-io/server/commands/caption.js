const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Caption extends BaseCommand {

  getUsage() {
    return [
      "/caption title [text]",
      "/caption subtitle [text]",
      "/caption [player] title [text]",
      "/caption [player] subtitle [text]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isSubCommand(text) {
    return ["title", "subtitle"].indexOf(text) !== -1
  }

  perform(player, args) {
    let row
    let col
    let entityToTeleport

    let selector = args[0]
    let subcommand
    let text

    let targetPlayers = this.getPlayersBySelector(selector)

    if (targetPlayers.length === 0) {
      if (this.isSubCommand(args[0])) {
        subcommand = args[0]
        text = args.slice(1).join(" ")
        this.caption(subcommand, text, this.game.getPlayerList())
      }
      return
    }

    subcommand = args[1]
    text = args.slice(2).join(" ")

    this.caption(subcommand, text, targetPlayers)
  }

  caption(subcommand, text, playerList) {

    let isTitle = subcommand === "title"

    try {
      let json = JSON.parse(text)
      json.text

      playerList.forEach((player) => {
        let message = i18n.t(data.locale, json.text)
        player.showError(message, { isTransparent: true, color: json.color, size: json.size, isTitle: isTitle })
      })
    } catch(e) {
      // not json. assume plain text

      playerList.forEach((player) => {
        let message = i18n.t(player.locale, text)
        player.showError(message, { isTransparent: true, isTitle: isTitle })
      })
    }

  }

}

module.exports = Caption
