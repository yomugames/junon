const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
class SpawnCorpse extends BaseCommand {

  getUsage() {
    return [
      "Spawns the corpse of a mob",
      "/spawncorpse [corpse_type] [row] [col]",
      "ex: /spawncorpse human 5 5"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const type = args[0] || ""
    const x = args[1]
    const y = args[2]

    this.sector.spawnCorpse({ player: player, type: type, x: x, y: y })
  }
}

module.exports = SpawnCorpse