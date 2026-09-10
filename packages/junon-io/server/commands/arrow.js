const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const BaseEntity = require("../entities/base_entity")

class Arrow extends BaseCommand {

  getUsage() {
    return [
      "Creates an around locked to the player that points to the specified direction",
      "/arrow set [arrow_id 1:10] [player] [point_to id/name]",
      "/arrow set [arrow_id 1:10] [player] [point_to id/name] [color] [size 1:35] [tool_tip] [bg true:false]",
      "/arrow remove [arrow_id] [player]",
      "/arrow clear [player]",
      "ex: /arrow set 1 kuroro 1234 red 25 Slime false",
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    if (!this.game.playerArrows) {this.game.playerArrows = {}}
    
    let subcommand = args[0]

    let selectedPlayers = this.getPlayersBySelector(args[2])
    if (subcommand == "clear") {
      selectedPlayers = this.getPlayersBySelector(args[1])
    if (selectedPlayers.length === 0) {
      caller.showChatError("No such player")
      return
    }
    } else {
    if (selectedPlayers.length === 0) {
      caller.showChatError("No such player")
      return
    }
  }
    
    switch(subcommand) {
      case "set": 
        if (!args[1] || parseInt(args[1]) > 15 || parseInt(args[1]) < 1) {
        caller.showChatError("Invalid Arrow ID")
          return
        }
        
        let entityById = this.game.getEntityByNameOrId(args[3])
        if (!entityById) {
          caller.showChatError(`Invalid entity ${args[3]} `)
          return
        }

        selectedPlayers.forEach(ply => {
          if (!this.game.playerArrows[ply.name]) {this.game.playerArrows[ply.name] = {}}
          this.game.playerArrows[ply.name][args[1]] = {
            pointTo:entityById.id,
            color:args[4],
            size:Math.max(Math.min(parseInt(args[5]||"24"),35),1),
            tooltip:args[6],
            isbg:args[7]
          }
        });
        break
      case "remove": {
        if (!args[1]) {
        caller.showChatError("No Arrow ID")
          return
        }
        selectedPlayers.forEach(ply => {
      if (!this.game.playerArrows[ply.name]) {this.game.playerArrows[ply] = {}}
        delete this.game.playerArrows[ply.name][args[1]]
        })
        break
      }
      case "clear": 
        selectedPlayers.forEach(ply => {
          delete this.game.playerArrows[ply.name]
        })
        break
      
 }
  }

}

module.exports = Arrow