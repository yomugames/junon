const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Help extends BaseCommand {
  isNonSandboxCommand() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    if (subcommand) {
      let command = this.game.commands[subcommand]
      if (command) {
        command.getUsage().forEach((usage) => {
          player.showChatSuccess(usage)
        })
        player.showChatSuccess("\n")
      }
      return
    }

    player.showChatSuccess("List of commands")
    player.showChatSuccess("/spectate - toggle spectator mode on/off")
    player.showChatSuccess("/hour     - get current hour")
    player.showChatSuccess("/day      - get current day")

    if (this.game.isPeaceful()) {

      if (player.hasCommandsPermission()) {
        player.showChatSuccess("/god       - toggle god mode on/off")
        player.showChatSuccess("/spawnitem - create item ")
        player.showChatSuccess("/effect    - add status effects to player")
        player.showChatSuccess("/give      - give item to player")
        player.showChatSuccess("/tp        - teleport entity")
        player.showChatSuccess("/kit       - create and manage kits")
        player.showChatSuccess("/event     - make events happen")
        player.showChatSuccess("/clear     - clear inventory")
        player.showChatSuccess("/fly       - toggle flying mode")
        player.showChatSuccess("/kill      - kill entities")
        player.showChatSuccess("/trader    - customize trader item list")
        player.showChatSuccess("/region    - manage regions")
        player.showChatSuccess("/force     - apply directional force to entity")
        player.showChatSuccess("/fill      - fill terrain on specified area")
        player.showChatSuccess("/spawnmob  - spawn mob")
        player.showChatSuccess("/sethealth - set health of entity")
        player.showChatSuccess("/dialogue  - assign dialogue on mob")
        player.showChatSuccess("/role      - assign role to player")
        player.showChatSuccess("/team      - manage teams")
        player.showChatSuccess("/gold      - manage gold")
        player.showChatSuccess("/interact  - manipulate buildings")
        player.showChatSuccess("/stat      - modify building or mob stats")
        player.showChatSuccess("/name      - modify building or mob label")
        player.showChatSuccess("/speed     - modify player speed")
        player.showChatSuccess("/spawncorpse - spawn corpse")
        player.showChatSuccess("/timer     - manage timers")
        player.showChatSuccess("/caption   - show message to players")
        player.showChatSuccess("/sidebar   - display text + scoreboard")
        player.showChatSuccess("/score     - manage player score")
        player.showChatSuccess("/ban       - ban players")
        player.showChatSuccess("/kick      - kick players")
        player.showChatSuccess("/setequipment - set equipment of player")
        player.showChatSuccess("/limit     - modify build limits")
        player.showChatSuccess("/setting   - modify settings")
        player.showChatSuccess("/chat      - send chat message to players")
        player.showChatSuccess("/suitcolor - change spacesuit color")
        player.showChatSuccess("/variable  - create variables for command block")
        player.showChatSuccess("/respawn   - respawn player")
        player.showChatSuccess("/health    - manage health")
        player.showChatSuccess("/hunger    - manage hunger")
        player.showChatSuccess("/stamina    - manage stamina")
        player.showChatSuccess("/oxygen    - manage oxygen")
        player.showChatSuccess("/wait      - delay next command by seconds in command block")
        player.showChatSuccess("/getnthword - gets nth word of sentence and sets it to $word variable")
        player.showChatSuccess("/getnthletter - gets nth letter of sentence and sets it to $letter variable")
        player.showChatSuccess("/dirt       - adds or removes dirt")
        player.showChatSuccess("/blood      - adds or removes blood")
        player.showChatSuccess("/scene      - play specific scenes")
        player.showChatSuccess("/needs      - add mob needs")
        player.showChatSuccess("/path      - set mob walk paths")
        player.showChatSuccess("/setowner      - set the owner of a building")
        player.showChatSuccess("/mute      - mute a specified player")
        player.showChatSuccess("/unmute      - unmute a specified player")
        player.showChatSuccess("/playsound      - play specific sounds")
        player.showChatSuccess("/path      - create and manage paths")
      }
    }
    player.showChatSuccess("\n")
  }

  isArgumentRequired() {
    return false
  }
}

module.exports = Help
