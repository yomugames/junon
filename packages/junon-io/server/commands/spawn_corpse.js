const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
class SpawnCorpse extends BaseCommand {

  getUsage() {
    return [
      "/spawncorpse [type]",
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