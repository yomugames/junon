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
    const row = args[1]
    const col = args[2]

    if (this.sector.isCorpseLimitExceeded()) {
      player.showChatError("Cannot exceed corpse limit of 200")
      return
    }

    if (typeof row !== 'undefined' && typeof col !== 'undefined') {
      if (this.sector.isOutOfBounds(row, col)) {
        player.showChatError("invalid row,col: " + [row, col].join(","))
        return
      }
    }

    this.sector.spawnCorpse({ player: player, type: type, x: col, y: row})
  }
}

module.exports = SpawnCorpse