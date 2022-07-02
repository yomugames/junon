const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Limit extends BaseCommand {
  getUsage() {
    return [
      "/limit list",
      "/limit set [building] [count]",
      "/limit remove [building]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const subcommand = args[0]
    let buildingName = this.sector.klassifySnakeCase(args[1] || "")
    let count

    switch(subcommand) {
      case "list":
        let limits = Object.keys(this.sector.buildLimits)
        if (limits.length === 0) {
          caller.showChatError("No build limits")
          return
        }

        let result = limits.map((name) => {
          let count = this.sector.getBuildLimit(name)
          return name + ":" + count
        })

        caller.showChatSuccess(result)
        break
      case "set":
        count = parseInt(args[2])

        if (isNaN(count) || count < 0 || count > 99999) {
          caller.showChatError("invalid count")
          return
        }

        if (!Protocol.definition().BuildingType[buildingName]) {
          caller.showChatError("No such building " + buildingName)
          return
        }

        this.sector.setBuildLimit(buildingName, count)
        caller.showChatSuccess("Build limit for " + buildingName + " set to " + count)
        break
      case "remove":
        if (!Protocol.definition().BuildingType[buildingName]) {
          caller.showChatError("No such building " + buildingName)
          return
        }

        this.sector.removeBuildLimit(buildingName)
        caller.showChatSuccess("Removed build limit for " + buildingName)
        break
      default:
        caller.showChatError("No such subcommand " + subcommand)
        break
    }



  }
}

module.exports = Limit
