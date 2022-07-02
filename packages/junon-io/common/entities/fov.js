const Constants = require("../constants")
const Helper = require("../helper")

class Fov {
  constructor(tileManager) {
    this.tileManager = tileManager
  }

  calculateFov(entity, options = {}) {
    let lightings = {}

    let visited = {}
    let LIGHT_TILE = 1
    let LIGHT_BLOCKER = 2

    let start = Date.now()

    // go through each angle surrounding player
    for(let i = 0; i < 360; i += 2) {
      let dx = Math.cos(i * Math.PI/180) * Constants.tileSize;
      let dy = Math.sin(i * Math.PI/180) * Constants.tileSize;

      let maxViewDistance = entity.getMaxViewDistance()
      let distanceStep = Helper.distance(0, 0, dx, dy)

      let x = entity.getX()
      let y = entity.getY()

      // traverse an angle until radius hit maximum distance
      for(let distance = 0 ; distance < maxViewDistance; distance++) {
        let row = Math.floor(y / Constants.tileSize)
        let col = Math.floor(x / Constants.tileSize)
        if (this.tileManager.isOutOfBounds(row, col)) {
          break
        }

        let tileKey = [row, col].join("-")
        if (!visited[tileKey]) {
          let tile = this.tileManager.getLightTile(row, col)
          if (tile && tile.entity && tile.entity.isLightBlocker()) {
            if (options.shouldIncludeLightBlocker) {
              lightings[tileKey] = { row: row, col: col }
            }
            
            visited[tileKey] = LIGHT_BLOCKER
            break
          } else {
            visited[tileKey] = LIGHT_TILE
            lightings[tileKey] = { row: row, col: col }
          }
        } else if (visited[tileKey] === LIGHT_BLOCKER) {
          break
        }
        
        x += dx
        y += dy
        distance += distanceStep
      }
    }

    let duration = Date.now() - start
    // console.log("fov duration: " + (duration/1000))

    return lightings
  }

}

module.exports = Fov