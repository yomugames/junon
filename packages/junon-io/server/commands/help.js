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

        player.showChatSuccess("\n")
player.showChatError("List of commands")
    player.showChatSuccess("/spectate - toggle spectator mode on/off")
    player.showChatSuccess("/hour     - get current hour")
    player.showChatSuccess("/day      - get current day")

    if (this.game.isPeaceful()) {

      if (player.hasCommandsPermission()) {
        player.showChatError("Moderation")
        player.showChatSuccess("/ban       - ban players")
        player.showChatSuccess("/kick      - kick players")
        player.showChatSuccess("/mute      - mute a specified player")
        player.showChatSuccess("/unmute      - unmute a specified player")
        player.showChatError("Admin commands")
        player.showChatSuccess("/caption   - show message to players")
player.showChatSuccess("/chat      - send chat message to players")
player.showChatSuccess("/chatprefix - assigns a tag to a player")
player.showChatSuccess("/clear     - clear inventory")
player.showChatSuccess("/effect    - add status effects to player")
player.showChatSuccess("/event     - make events happen")
player.showChatSuccess("/fill      - fill terrain on specified area")
player.showChatSuccess("/fly       - toggle flying mode")
player.showChatSuccess("/force     - apply directional force to entity")
player.showChatSuccess("/give      - give item to player")
player.showChatSuccess("/god       - toggle god mode on/off")
player.showChatSuccess("/gold      - manage gold")
player.showChatSuccess("/health    - manage health")
player.showChatSuccess("/hunger    - manage hunger")
player.showChatSuccess("/kill      - kill entities")
player.showChatSuccess("/kit       - create and manage kits")
player.showChatSuccess("/limit     - modify build limits")
player.showChatSuccess("/oxygen    - manage oxygen")
player.showChatSuccess("/respawn   - respawn player")
player.showChatSuccess("/role      - assign role to player")
player.showChatSuccess("/score     - manage player score")
player.showChatSuccess("/setequipment - set equipment of player")
player.showChatSuccess("/sethealth - set health of entity")
player.showChatSuccess("/setowner      - set the owner of a building")
player.showChatSuccess("/setting   - modify settings")
player.showChatSuccess("/sidebar   - display text + scoreboard")
player.showChatSuccess("/spawncorpse - spawn corpse")
player.showChatSuccess("/spawnitem - spawn an item ")
player.showChatSuccess("/spawnmob  - spawn mob")
player.showChatSuccess("/speed     - modify player speed")
player.showChatSuccess("/stamina    - manage stamina")
player.showChatSuccess("/stat      - modify building or mob stats")
player.showChatSuccess("/suitcolor - change spacesuit color")
player.showChatSuccess("/team      - manage teams")
player.showChatSuccess("/tp        - teleport entity")
player.showChatSuccess("/trader    - customize trader item list")
        player.showChatError("World and Enviroment")
     player.showChatSuccess("/blood      - adds or removes blood")
player.showChatSuccess("/dialogue  - assign dialogue on mob")
player.showChatSuccess("/dirt       - adds or removes dirt")
player.showChatSuccess("/goal      - manage mob(s) goals")
player.showChatSuccess("/interact  - manipulate buildings")
player.showChatSuccess("/name      - modify building or mob label")
player.showChatSuccess("/needs      - add mob needs")
player.showChatSuccess("/path      - create and manage paths")
player.showChatSuccess("/playsound      - play specific sounds")
player.showChatSuccess("/projectile - spawn projectiles")
player.showChatSuccess("/scene      - play specific scenes")
        player.showChatError("Command Block")
       player.showChatSuccess("/getnthletter - gets nth letter of sentence and sets it to $letter variable")
player.showChatSuccess("/getnthword - gets nth word of sentence and sets it to $word variable")
player.showChatSuccess("/ping      - ping an entity")
player.showChatSuccess("/region    - manage regions")
player.showChatSuccess("/timer     - manage timers")
player.showChatSuccess("/variable  - create variables for command block")
player.showChatSuccess("/wait      - delay next command by seconds in command block")
        }
    }
  }

  isArgumentRequired() {
    return false
  }
}

module.exports = Help
