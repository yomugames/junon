const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Timer extends BaseCommand {
  getUsage() {
    return [
      "/timer list",
      "/timer start [name] [duration]",
      "/timer stop [name]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
    return true
  }

  perform(caller, args) {
    let subcommand = args[0]
    let name

    switch(subcommand) {
      case "list":
        let result = Object.values(this.game.timers).map((timer) => {
          return `${timer.name} duration: ${timer.duration} tick: ${timer.tick}\n`
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

        let duration = parseInt(args[2])
        if (isNaN(duration) || duration < 0) {
          caller.showChatError("invalid duration")
          return
        }

        this.game.addTimer({
          name: name,
          duration: duration
        })

        caller.showChatSuccess("Timer " + name + " started. duration: " + duration + "s")
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
