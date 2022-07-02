const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Variable extends BaseCommand {
  getUsage() {
    return [
      "/variable list",
      "/variable set [name] [value]",
      "/variable delete [name]",
      "/variable gain [name] [amount]",
      "/variable lose [name] [amount]",
      "\n",
      "ex. /variable set powerlevel 10",
      "Add $ to variable name in command blocks to access value",
      "$powerlevel will have value of 10"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  getReservedVariableNames() {
    return {
      "player": true,
      "playerId": true,
      "playerRole": true,
      "entityId": true,
      "entityType": true,
      "count": true,
      "itemType": true,
      "message": true,
      "attackingPlayer": true,
      "attackingPlayerRole": true,
      "attackingMob": true,
      "killingPlayer": true,
      "killingPlayerRole": true,
      "killingMob": true,
      "type": true,
      "remaining": true,
      "team": true,
      "region": true,
      "previous": true,
      "current": true,
      "delta": true,
      "corpseType": true,
      "corpseId": true,
      "foodType": true,
      "mobType": true,
      "seconds": true,
      "$storageId": true,
      "$storageType": true,
      "$itemType": true
    }
  }

  hasInvalidCharacter(key) {
    return key.match(/[^a-zA-Z0-9_$]/)
  }

  perform(caller, args) {
    let subcommand = args[0]
    let key
    let value
    let amount

    switch(subcommand) {
      case "list":
        let result = []
        for (let key in this.sector.eventHandler.variables) {
          let value = this.sector.eventHandler.variables[key]
          result.push([key, value].join("="))
        }

        if (result.length > 0) {
          caller.showChatSuccess(result.join(", "))
        } else {
          caller.showChatError("No variables")
        }
        
        break
      case "set":
        key = args[1]
        value = args.slice(2).join(" ") || ""
        value = value.substring(0, 1000)

        if (this.getReservedVariableNames()[key]) {
          caller.showChatError("Cannot use reserved variable name")
        } else if (this.sector.eventHandler.hasReachedMaxVariableCount()) {
          caller.showChatError("reached max limit of 100 variables")
        } else if (this.hasInvalidCharacter(key)) {
          caller.showChatError("invalid variable name")
        } else if (key) {
          this.sector.eventHandler.setVariable(key, value)
          caller.showChatSuccess([key, value].join("="))
        }

        break
      case "delete":
        key = args[1]

        this.sector.eventHandler.removeVariable(key)
        caller.showChatSuccess("Removed variable: " + key)

        break
      case "gain":
        key = args[1]
        amount = parseInt(args[2])

        if (!this.sector.eventHandler.hasVariable(key)) {
          caller.showChatError("no such variable")
          return
        }

        value = this.sector.eventHandler.getVariable(key)
        if (isNaN(value) || isNaN(amount) || value === "") {
          caller.showChatError("invalid operation")
        } else {
          value = parseInt(value) + parseInt(amount)
          this.sector.eventHandler.setVariable(key, value.toString())
          caller.showChatSuccess([key, value].join("="))
        }
        break
      case "lose":
        key = args[1]
        amount = parseInt(args[2])

        if (!this.sector.eventHandler.hasVariable(key)) {
          caller.showChatError("no such variable")
          return
        }

        value = this.sector.eventHandler.getVariable(key)
        if (isNaN(value) || isNaN(amount) || value === "") {
          caller.showChatError("invalid operation")
        } else {
          value = parseInt(value) - parseInt(amount)
          this.sector.eventHandler.setVariable(key, value.toString())
          caller.showChatSuccess([key, value].join("="))
        }

        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
    }


  }
}

module.exports = Variable