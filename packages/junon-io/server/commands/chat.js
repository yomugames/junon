const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Chat extends BaseCommand {

  getUsage() {
    return [
      "/chat [text]",
      "/chat [player] [text]",
      "/chat @a %success%Welcome players",
      "/chat @a %error%Something wrong happened"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let row
    let col
    let entityToTeleport

    let selector = args[0]
    let subcommand
    let text

    let isSelectorProvided = selector ? selector[0] === "@" : false
    let targetPlayers = this.getPlayersBySelector(selector)

    if (!isSelectorProvided && targetPlayers.length === 0) {
      text = args.slice(0).join(" ")
      targetPlayers = this.game.getPlayerList()
    } else {
      text = args.slice(1).join(" ")
    }

    targetPlayers.forEach((player) => {
      let message = player.replaceBadWords(text)
      this.getSocketUtil().emit(player.getSocket(), "ServerChat", {
        message: message
      })
    })
  }

}

module.exports = Chat
