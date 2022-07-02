const BaseMob = require("./base_mob")

class LandMob extends BaseMob {

  getWalkablePlatform() {
    let tile = super.getStandingPlatform()
    return tile
  }

  isLandMob() {
    return true
  }

  limitBiomeMovement(targetEntityToMove) {
    let platform = this.getWalkablePlatform()
    let nonTraversablePlatform = !platform || (platform.isTerrain() && platform.isForegroundTile()) 
    if (nonTraversablePlatform && this.lastPlatform) {
      // if landmob out of ground, go back to ground
      let backtrackAngle = Math.atan2(this.lastPlatform.getY() - this.getY(), this.lastPlatform.getX() - this.getX())
      let backtrackForce = this.getForceFromAngle(backtrackAngle)
      targetEntityToMove.applyForce(backtrackForce)

      if (this.isWandering) {
        this.changeWanderDirection(targetEntityToMove)
      }

      return true
    } 

    this.lastPlatform = platform
    return false
  }

  canBeKnocked() {
    return true
  }

}

module.exports = LandMob