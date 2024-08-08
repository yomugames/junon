const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const BadWordsFilter = require("../util/bad_words_filter")
const Helper = require('../../common/helper')

class Team extends BaseCommand {

  getUsage() {
    return [
      "/team list",
      "/team add [name]",
      "/team remove [name]",
      "/team join [name] [player]",
      "/team leave [player]",
      "/team setleader [name] [player]",
      "/team assignleader [name]",
      "/team setowner [name] [region_name]",
      "/team rename [name] [newName]",
      "/team editrole [teamname] [rolename] [permission] [true|false]",
      "/team editrole blueteam guest EditSign false"
    ]
  }

      // "/team scoreindex "
      // "/team scorecolor "
      // "/team prefix [allow|deny]"

  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
    return true
  }

  perform(player, args) {
    let name
    let playerName
    let success
    let team
    let players

    let subcommand = args[0]

    switch(subcommand) {
      case "list":
        let teamNames = Object.values(this.game.teams).map((team) => {
          if (team.isSectorOwner()) return "owner"
          return team.name
        })
        player.showChatSuccess(teamNames.join(", "))

        break

      case "editrole":
        name = args[1]
        let roleName = args[2]
        let permission = args[3]
        let value = args[4]

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team")
          return
        }

        let role = team.getRoleByName(roleName)
        if (!role) {
          player.showChatError("No such role")
          return
        }

        let permissionName = Helper.camelCase(permission)
        if (!role.isPermissionValid(permissionName)) {
          player.showChatError("No such permission")
          return
        }

        let data = {}
        let isToggled = value == "true" ? true : false
        data[permissionName] = isToggled
        role.applyPermissions(data)
        player.showChatSuccess(`Team: ${team.name} role: ${roleName}, permission: ${permissionName} set to ${isToggled}`)

        break

      case "add":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        let existingTeam = this.game.getTeamByName(name)
        if (existingTeam) {
          player.showChatError("Team already exists")
          return
        }

        team = this.game.createTeam(name)
        team.leaderUid = player.getUid()
        player.showChatSuccess(`Team ${name} created`)

        break
      case "prefix":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        let flag = args[2]
        if (flag === "allow") {
          team.setPrefix(flag)
        } else if (flag === "deny") {
          team.setPrefix(flag)
        }

        break
      case "rename":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        let newName = args[2]
        if (!newName) {
          player.showChatError("Must specify new team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        
        if (this.game.getTeamByName(newName)) {
          player.showChatError("Team name already taken: " + newName)
          return
        }

        if (team.isSectorOwner()) {
          player.showChatError("Cant rename colony owner team " + name)
          return
        }

        if (BadWordsFilter.isBadWord(newName)) {
          player.showChatError("Name is not appropriate")
        } else {
          team.setName(newName)
        }

        break

      case "remove":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        if (team.isSectorOwner()) {
          player.showChatError("Cant remove colony owner team " + name)
          return
        }

        team.forEachMember((member) => {
          this.game.getCreatorTeam().addMember(member)
        })

        team.remove()
        player.showChatSuccess(`Team ${name} removed`)

        break
      case "scoreindex":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        let scoreIndex = parseInt(args[2])
        if (isNaN(scoreIndex)) {
          player.showChatError("invalid index")
          return
        }

        team.setScoreIndex(scoreIndex)

        break
      case "scorecolor":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        let scoreColor = args[2]
        let validColors = ['0', '1', '2', '3', '4', '5', '6', '7', '8',
                           '9', 'a', 'b', 'c', 'd', 'e', 'f']
        if (validColors.indexOf(scoreColor) === -1) {
          player.showChatError("Valid colors are 0-9, a-f")
          return
        }

        team.setScoreColor(scoreColor)

        break

      case "join":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        playerName = args[2]
        players = this.getPlayersBySelector(playerName)
        if (players.length === 0) {
          player.showChatError("No players found - " + playerName)
          return
        }

        players.forEach((targetPlayer) => {
          this.game.joinTeam(name, targetPlayer)
          player.showChatSuccess(`${targetPlayer.name} joined ${name}`)
        })

        break
      case "leave":
        playerName = args[1]
        players = this.getPlayersBySelector(playerName)
        if (players.length === 0) {
          player.showChatError("No players found - " + playerName)
          return
        }

        let leaveMode = args[2]

        players.forEach((targetPlayer) => {
          targetPlayer.removeTeamMemberships()
          if (leaveMode === 'void') {
            targetPlayer.createSelfTeam()
          } else {
            if (this.game.getCreatorTeam()) {
              this.game.getCreatorTeam().addMember(targetPlayer)
            }
          }

          player.showChatSuccess(`${targetPlayer.name} left ${targetPlayer.getTeam().name}`)
        })

        break
      case "setleader":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        playerName = args[2]
        let targetPlayer = this.game.getPlayerByNameOrId(playerName)
        if (!targetPlayer) {
          player.showChatError("No such player " + playerName)
          return
        }

        team.setLeader(targetPlayer)
        player.showChatSuccess("Team leader is now " + team.getLeader().name)

        break
      case "assignleader":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        team.chooseNewRandomleader()

        if (team.getLeader()) {
          player.showChatSuccess("Team leader is now " + team.getLeader().name)
        } else {
          player.showChatError("No leader assigned")
        }

        break
      case "setowner":
        name = args[1]
        if (!name) {
          player.showChatError("Must specify team name")
          return
        }

        team = this.game.getTeamByName(name)
        if (!team) {
          player.showChatError("No such team " + name)
          return
        }

        let regionName = args[2]
        let region = this.game.sector.getRegion(regionName)
        if (!region) {
          player.showChatError("No such region " + regionName)
          return
        }

        let entities = region.getAllBoundedEntities()
        for (var i = 0; i < entities.length; i++) {
          let entity = entities[i]
          entity.setOwner(team)
        }

        break
      default:
        player.showChatError("No such subcommand /team " + subcommand)
        break
    }
  }

}

module.exports = Team
