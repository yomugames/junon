const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Helper = require("../../common/helper")

class Objectives extends BaseCommand {

  getUsage() {
    return [
      "/objectives list",
      "/objectives assign [player] [objective]",
      "/objectives complete [objective]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const subcommand = args[0]
    let playerSelector
    let objectiveSelector
    let objectives
    let objective
    let players

    switch(subcommand) {
      case "list":
        caller.showChatSuccess(Object.keys(this.sector.objectives).join(", "))
        break
      case "assign":
        playerSelector = args[1]
        objectiveSelector = args[2]

        players = this.getPlayersBySelector(playerSelector)
        if (players.length === 0) {
          caller.showChatError("invalid player target")
          return
        }

        objectives = this.game.getObjectivesBySelector(objectiveSelector)
        Helper.shuffleArray(objectives)

        for (var i = 0; i < objectives.length; i++) {
          objective = objectives[i]
          let playerIndex = i % players.length
          let player = players[playerIndex]
          objective.assignTo(player)
        }

        break
      case "assignall":
        playerSelector = args[1]
        objectiveSelector = args[2]

        players = this.getPlayersBySelector(playerSelector)
        if (players.length === 0) {
          caller.showChatError("invalid player target")
          return
        }

        objective = this.game.sector.objectives[objectiveSelector]
        players.forEach((player) => {
          objective.assignTo(player)
        })

        break
      case "complete":
        objectiveSelector = args[1]
        objectives = this.game.getObjectivesBySelector(objectiveSelector)
        objectives.forEach((objective) => {
          objective.setComplete()
        })
        break
      default:
        caller.showChatError("No such subcommand /objectives " + subcommand)
    }
  }
}

module.exports = Objectives
