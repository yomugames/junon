const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Caption extends BaseCommand {

  getUsage() {
    return [
      "Shows a large announcement in the screen of the specified player",
      "/caption [type] [text]",
      "/caption [player] [type] [text]",
      "ex: /caption kuroro title Hello, World!",
      "Caption types: title, subtitle, center, footer, error, success"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  isSubCommand(text) {
    return ["title", "subtitle", "footer", "center","error", "success"].indexOf(text) !== -1
  }

  perform(player, args) {
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
let isFooter = subcommand === "footer"
let isCenter = subcommand === "center"
let isError = subcommand === "error"
let isSuccess = subcommand === "success"

    try {
      let json = JSON.parse(text)
      json.text

      playerList.forEach((player) => {
        let message = i18n.t(data.locale, json.text)
        player.showError(message, { isTransparent: true, color: json.color, size: json.size, isTitle: isTitle,isCenter:isCenter, isFooter:isFooter, isWarning:isError, isSuccess:isSuccess })
      })
    } catch(e) {
      // not json. assume plain text

      playerList.forEach((player) => {
        let message = i18n.t(player.locale, text)
        player.showError(message, { isTransparent: true, isTitle: isTitle, isCenter:isCenter, isFooter:isFooter, isWarning:isError, isSuccess:isSuccess })
      })
    }

  }

}

module.exports = Caption
