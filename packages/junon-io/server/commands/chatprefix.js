const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class ChatPrefix extends BaseCommand {

  getUsage() {
    return [
      "/chatprefix set [player] [prefix] [color] [style]",
      "/chatprefix clear [player]",
      "Styles:",
      "1: [Test], 2: (Test), 3: {Test}",
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    if (!this.game.playerChatPrefixes) {this.game.playerChatPrefixes = {}}
    let selectedPlayers = this.getPlayersBySelector(args[1])
    if (selectedPlayers.length === 0) {
      caller.showChatError("No such player")
      return
    }
    
    let subcommand = args[0]
    let style = args[4]
    if (style) {
      if (style==1) {
        style = "[]"
      } else if (style==2) {
        style = "()"
      } else {
        style = "{}"
      }
    } else {style="[]"}

    switch(subcommand) {
      case "set": 
      if (!args[2]) {
        caller.showChatError("No prefix")
          return
        }
        selectedPlayers.forEach(ply => {
          console.log(ply.name)
          this.game.playerChatPrefixes[ply.name] = {
            prefix:args[2].slice(0, 8),
            color:args[3] || "#ffffff",
            styleA:style[0],
            styleB:style[1]
          }
        });
        break
      case "clear": 
        selectedPlayers.forEach(ply => {
          delete this.game.playerChatPrefixes[ply.name]
        })
        break
 }
  }

}

module.exports = ChatPrefix