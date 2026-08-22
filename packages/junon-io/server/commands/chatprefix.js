const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class ChatPrefix extends BaseCommand {

  getUsage() {
    return [
      "Gives a player a custom tag before their name in chat",
      "/chatprefix set [player] [text] [color] [style:1-7]",
      "/chatprefix clear [player]",
      "ex: /chatprefix set kuroro Owner red 1",
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
    if (style && style < 9) {
      if (style==1) {
        style = "[]"
      } else if (style==2) {
        style = "()"
      } else if (style==3){
        style = "{}"
      } else if (style==4) {
        style = '""'
      } else if (style==5) {
        style = " -"
      } else if (style==6) {
        style = " /"
      } else if (style==7) {
        style = " :"
      } else if (style==8) {
        style = "  "
      }
      
    } else {style="[]"}

    switch(subcommand) {
      case "set": 
      if (!args[2]) {
        caller.showChatError("No prefix")
          return
        }
        selectedPlayers.forEach(ply => {
          this.game.playerChatPrefixes[ply.name] = {
            prefix:args[2].replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
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