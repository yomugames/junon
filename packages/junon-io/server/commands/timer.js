const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Timer extends BaseCommand {
  getUsage() {
    return [
      "Manages timers",
      "/timer list",
      "/timer start [name] [duration] [tick]",
      "/timer stop [name]",
      "ex: /timer start Intermission 15 1"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let subcommand = args[0]
    let name

    switch(subcommand) {
      case "list":
        let result = Object.values(this.game.timers).map((timer) => {
          return `${timer.name} Duration: ${timer.duration} Tick: ${timer.tick} Every: ${timer.every}\n`
        })
        if (!result) {
          caller.showChatSuccess("No timers")
        } else {
          caller.showChatSuccess(result)
        }
 
        break

      case "start":
        name = args[1]

        if (!name) {
          caller.showChatError("name required")
          this.showUsage(caller)
          return
        }

        let duration = parseFloat(args[2])
        if (isNaN(duration) || duration < 0) {
          caller.showChatError("invalid duration")
          return
        }
        let tick = parseFloat(args[3]) || 1

        this.game.addTimer({
          name: name,
          duration: duration,
          every: tick,
        })

        caller.showChatSuccess("Timer " + name + " started. Duration: " + duration + "s. Every: "+(tick))
        break

      case "stop":
        name = args[1]

        if (!name) {
          caller.showChatError("name required")
          this.showUsage(caller)
          return
        }

        if (!this.game.hasTimer(name)) {
          caller.showChatSuccess("Timer not found")
        }

        this.game.removeTimer({
          name: name
        })

        caller.showChatSuccess("Timer " + name + " removed")
        break
      default:
    }
 
  }

}

module.exports = Timer
