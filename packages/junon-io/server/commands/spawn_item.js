const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class SpawnItem extends BaseCommand {

  getUsage() {
    return [
      "/spawnitem [type] [count]",
      "/spawnitem [type] [count] [row] [col]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const type = args[0]
    const count = args[1] ? parseInt(args[1]) : null
    const row = args[2]
    const col = args[3]

    let x, y

    if (col) {
      x = col * Constants.tileSize + Constants.tileSize/2
    } else {
      const xp = Constants.tileSize * Math.cos(caller.getRadAngle())
      x = caller.getX() + xp
    }

    if (row) {
      y = row * Constants.tileSize + Constants.tileSize/2
    } else {
      const yp = Constants.tileSize * Math.sin(caller.getRadAngle())
      y = caller.getY() + yp
    }

    if (typeof x === 'undefined' || typeof y === 'undefined') return
    if (isNaN(x) || isNaN(y)) return

    if (typeof row !== 'undefined' && typeof col !== 'undefined') {
      if (this.sector.isOutOfBounds(row, col)) {
        caller.showChatError("invalid row,col: " + [row, col].join(","))
        return
      }
    }


    this.sector.spawnItem({ player: caller, type: type, count: count, x: x, y: y })
  }
}

module.exports = SpawnItem