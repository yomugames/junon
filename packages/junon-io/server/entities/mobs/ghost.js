const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Ghost extends BaseMob {

  moveEntity(targetEntityToMove, deltaTime) {
    // can only be manually controlled by player
  }

  limitVerticalMovement() {
    // can travel freely
  }

  limitHorizontalMovement() {
    // can travel freely
  }

  triggerTraps() {
    
  }

  consumeFire() {
    
  }

  isGhost() {
    return true
  }

  onGridPositionChanged() {
    if (!this.master) return

    if (this.master.shouldFollowGhost) {
      this.master.setPosition(this.getX(), this.getY())
    }

    this.master.requestNewChunks()
  }

  setHealth() {
    // cant die
  }

  getType() {
    return Protocol.definition().MobType.Ghost
  }

  getConstantsTable() {
    return "Mobs.Ghost"
  }

  onChunkRegionChanged(currChunkRegion) {
    
  }

}

module.exports = Ghost
