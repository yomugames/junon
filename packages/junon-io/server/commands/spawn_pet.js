const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class SpawnPet extends BaseCommand {

  getUsage() {
    return [
      "/spawnpet [type] [count] [x] [y]",
    ]
  }

  isEnabled() {
    return false
  }

  perform(player, args) {
    const type = args[0]
    if (!type) {
      player.showChatError("/spawnpet [type] [count] [x] [y]")
    }

    const count = args[1] ? parseInt(args[1]) : null
    const x = args[2]
    const y = args[3]
    const goal = this

    this.sector.spawnPet({ player: player, type: type, count: count, goal: goal, x: x, y: y })
  }
}

module.exports = SpawnPet