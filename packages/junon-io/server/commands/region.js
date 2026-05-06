const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Region = require("../entities/region")

class RegionCommand extends BaseCommand {

  getUsage() {
    return [
      "/region display",
      "/region list",
      "/region set [name] [start_row] [start_col] [end_row] [end_col]",
      "/region delete [name]",
      "/region rename [name] [newname]",
      "/region flag [name] [key] [value]",
      "/region flag [name] [build] [everyone | role | playername]",
      "/region setowner [name] [team]",
      "ex: allowed flags: " + this.getAllowedFlags().join(", ")
    ]
  }

  isNonSandboxCommand() {
    return true
  }

  getAllowedFlags() {
    return ["build", "pvp", "map_label", "restrict", "priority"]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let regionName
    let region
    let success

    let subcommand = args[0]

    switch(subcommand) {
      case "display":
        player.toggleRegionVisible()
        player.emitSocket("RegionUpdated", { displayRegion: player.isRegionVisible, playerId: player.id })
        break
      case "list":
        let regionNames = Object.keys(this.sector.regions)
        if (regionNames.length === 0) {
          player.showChatSuccess("No regions")
        } else {
          player.showChatSuccess(regionNames.join(", "))
        }
        break
      case "set":
        regionName = args[1]
        if (!regionName) {
          player.showChatError("missing region name")
          return
        }

        let startRow = parseInt(args[2])
        let startCol = parseInt(args[3])
        let endRow   = parseInt(args[4])
        let endCol   = parseInt(args[5])

        if (!Region.isBoundsValid(this.sector, startRow, startCol, endRow, endCol)) {
          // show invalid
          player.showChatError("/region set [name] [start_row] [start_col] [end_row] [end_col]")
          return
        }

        region = this.sector.getRegion(regionName)
        if (!region) {
          region = new Region(this.sector, { name: regionName })
        }

        region.setDimensions(startRow, startCol, endRow, endCol)
        player.setRegionVisible(true)
        player.showChatSuccess("region modified")
        player.emitSocket("RegionUpdated", { displayRegion: true, playerId: player.id })
        break
      case "delete":
        regionName = args[1]
        if (!regionName) {
          player.showChatError("missing region name")
          return
        }
        region = this.sector.getRegion(regionName)
        if (!region) {
          player.showChatError("region " + regionName + " not found")
          return
        }

        region.remove()
        player.showChatSuccess("region deleted")
        break
      case "setowner":
        regionName = args[1]
        let teamName = args[2] || ""
        if (!regionName) {
          player.showChatError("missing region name")
          return
        }
        region = this.sector.getRegion(regionName)
        if (!region) {
          player.showChatError("region " + regionName + " not found")
          return
        }

        let team = this.game.getTeamByName(teamName)
        if (teamName && !team) {
          player.showChatError("No such team " + teamName)
          return
        }

        let entities = region.getAllBoundedEntities()
        for (var i = 0; i < entities.length; i++) {
          let entity = entities[i]
          entity.setOwner(team)
        }

        break
      case "rename":
        regionName = args[1]
        if (!regionName) {
          player.showChatError("missing region name")
          return
        }

        region = this.sector.getRegion(regionName)
        if (!region) {
          player.showChatError("region " + regionName + " not found")
          return
        }

        let newRegionName = args[2]
        if (!newRegionName) {
          player.showChatError("/region rename [name] [newname]")
          return
        }

        region.rename(regionName, newRegionName)
        player.showChatSuccess(`renamed region ${regionName} to ${newRegionName} `)
        break
      case "flag":
        regionName = args[1]
        if (!regionName) {
          player.showChatError("missing region name")
          return
        }

        region = this.sector.getRegion(regionName)
        if (!region) {
          player.showChatError("region " + regionName + " not found")
          return
        }

        if (args.length === 2) {
          // show list of flags
          let flags = region.prettyPrintFlags()
          if (!flags) {
            player.showChatSuccess("No flags found")
          } else {
            player.showChatSuccess(flags)
          }

          return
        }

        let validFlags = this.getAllowedFlags()
        let flag = args[2]
        if (validFlags.indexOf(flag) === -1) {
          player.showChatError("allowed flags are " + validFlags.join(", "))
          return
        }

        let desiredFlagValue = args[3]
        if (!desiredFlagValue) {
          let flagValue = region.flags[flag]
          if (!flagValue) {
            player.showChatSuccess("(unset)")
          } else {
            player.showChatSuccess(flagValue)
          }

          return
        }

        if (this.isFlagValueAllowed(flag, desiredFlagValue)) {
          region.setFlag(flag, desiredFlagValue)
          player.showChatSuccess(`${regionName} flag ${flag} set to ${desiredFlagValue}`)
        } else {
          player.showChatError(`${regionName} flag ${flag} allowed values are: ${this.getAllowedFlagValues(flag).join(",")}`)
        }
        break
      default:
        player.showChatError("No such subcommand /region " + subcommand)
        break
    }
  }

  isFlagValueAllowed(flag, desiredFlagValue) {
    let allowed = this.getAllowedFlagValues(flag)
    if (allowed.length === 0) return true

    return allowed.indexOf(desiredFlagValue) !== -1
  }

  getAllowedFlagValues(flag) {
    if (flag === 'priority') {
      return ["1", "2", "3", "4", "5"]
    } else if (flag === 'pvp' || flag === 'map_label') {
      return ["allow", "deny"]
    } else {
      return []
    }
  }

}

module.exports = RegionCommand

