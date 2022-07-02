const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")

class Projectile extends BaseCommand {

  getUsage() {
    return [
      "/projectile [type] [row] [col] "
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  isEnabled() {
    return false
  }

  perform(caller, args) {
    const type = args[0]
    const row = parseInt(args[1])
    const col = parseInt(args[2])
    let keyValueArgs = isNaN(row) ? args.slice(3) : args.slice(1)
    let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)

    let x, y

    if (col) {
      x = col * Constants.tileSize + Constants.tileSize/2
    } else if (caller.isPlayer()) {
      x = caller.getX() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    if (row) {
      y = row * Constants.tileSize + Constants.tileSize/2
    } else if (caller.isPlayer()) {
      y = caller.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    if (typeof x === 'undefined' || typeof y === 'undefined') return

    if (keyValueMap["scatter"]) {
      let scatterCount = 10
      let rowSpread = 8
      for (var i = 0; i < scatterCount; i++) {
        let deltaRow = rowSpread - Math.floor(Math.random() * rowSpread) * 2
        let deltaCol = rowSpread - Math.floor(Math.random() * rowSpread) * 2
        let otherX = x + deltaCol * Constants.tileSize + Constants.tileSize/2
        let otherY = y + deltaRow * Constants.tileSize + Constants.tileSize/2
        this.sector.spawnProjectile({ caller: caller, type: type, x: otherX, y: otherY, keyValueMap: keyValueMap })
      }
    } else {
      this.sector.spawnProjectile({ caller: caller, type: type, x: x, y: y, keyValueMap: keyValueMap })
    }
    
  }
}

module.exports = Projectile