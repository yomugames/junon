const BaseCommand = require("./base_command")

// Lets the world owner take over one of the unclaimed
// characters of an imported world (see junon-common/save_importer.js), or go
// back to a new character. The character being left becomes unclaimed.
class Character extends BaseCommand {
  getUsage() {
    return [
      "Switches which saved character you play (world owner only)",
      "/character list [search]",
      "/character [name]",
      "/character new",
      "ex: /character list kur"
    ]
  }

  isNonSandboxCommand() {
    return true
  }

  isDelayable() {
    return false
  }

  async perform(caller, args) {
    if (!caller.isPlayer()) return

    if (!caller.isSectorOwner()) {
      caller.showChatError("permission denied")
      return
    }

    let subcommand = args[0]
    if (subcommand === "list") {
      this.listCharacters(caller, args.slice(1).join(" "))
    } else if (subcommand === "new") {
      await this.game.switchCharacter(caller, null)
    } else {
      let character = this.findCharacter(args.join(" "))
      if (!character) {
        caller.showChatError("No unclaimed character named " + args.join(" ") + ". Try /character list")
        return
      }

      await this.game.switchCharacter(caller, character.getUID())
    }
  }

  listCharacters(caller, search) {
    const maxLines = 15
    let query = search.toLowerCase()
    let characters = this.game.getUnclaimedCharacters().filter((playerData) => {
      return playerData.getName().toLowerCase().includes(query)
    }).sort((a, b) => a.getName().localeCompare(b.getName()))

    if (characters.length === 0) {
      caller.showChatError("No unclaimed characters" + (query ? " matching " + search : ""))
      return
    }

    characters.slice(0, maxLines).forEach((playerData) => {
      let team = playerData.getTeam()
      caller.showChatSuccess(playerData.getName() + (team ? " (" + team.name + ")" : ""))
    })

    if (characters.length > maxLines) {
      caller.showChatSuccess("...and " + (characters.length - maxLines) + " more. Narrow it down with /character list [search]")
    }
  }

  // by name (case-insensitive), or by imported id when names repeat
  findCharacter(nameOrUid) {
    let characters = this.game.getUnclaimedCharacters()
    let lowerName = nameOrUid.toLowerCase()

    return characters.find((playerData) => playerData.getUID() === nameOrUid) ||
           characters.find((playerData) => playerData.getName().toLowerCase() === lowerName)
  }
}

module.exports = Character
