const BaseRobot = require("./base_robot")
const Protocol = require("./../../../../common/util/protocol")
const Constants = require("./../../../../common/constants.json")

class CleanBot extends BaseRobot {

  getType() {
    return Protocol.definition().MobType.CleanBot
  }

  getConstantsTable() {
    return "Mobs.CleanBot"
  }

  findDirtyPlatformEveryInterval() {
    let isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0
    if (!isFiveSecondInterval) return

    this.findDirtyPlatform()
  }

  findDirtyPlatform() {
    if (this.hasMaster()) return

    let dirtyPlatformGoal = this.goals.find((goal) => {
      return goal.getTargetEntity().hasDirt()
    })

    if (dirtyPlatformGoal) {
      if (dirtyPlatformGoal.getTargetEntity().hasObstacleOnTop()) {
        dirtyPlatformGoal.remove()
        this.removeCleanTarget()      
      }
      return
    }

    if (this.isFindingDirtInProgress) return
    this.isFindingDirtInProgress = true

    this.sector.mobTaskQueue.getQueue().push(() => {
      this.findDirtyPlatformGoal()
    })
  }

  cleanPlatform() {
    if (this.lastCleanTimestamp) {
      let elapsedSinceLastClean = this.game.timestamp - this.lastCleanTimestamp
      if (elapsedSinceLastClean < this.getCleanTimestampInterval()) {
        return
      }
    }

    let platform = this.getStandingPlatform()
    if (!platform) {
      this.setBehavior(Protocol.definition().BehaviorType.Seek)
      return
    }

    if (platform.getDirtLevel() > 0) {
      platform.reduceDirt()
      // console.log("reduce platform " + platform.getCoord().join(",") + " dirt to " + platform.getDirtLevel())
      this.lastCleanTimestamp = this.game.timestamp
      this.setBehavior(Protocol.definition().BehaviorType.Clean)
      this.stopMoving()
    } else {
      this.setBehavior(Protocol.definition().BehaviorType.Seek)
      this.findDirtyPlatform()
    }
  }

  removeCleanTarget() {
    if (this.cleanTarget) {
      this.cleanTarget.unclaim(this)
      this.cleanTarget = null
    }
  }

  addCleanTarget(platform) {
    this.cleanTarget = platform
    this.cleanTarget.claim(this)
  }

  consumeAndProduceDirt() {
    // dont create dirt
  }

  // cleanbot should be on exact tile for goal to be reached..
  hasReachedGoal(goal) {
    let goalTarget = goal.getTargetEntity()

    if (this.isMaster(goalTarget)) {
      let distanceFromGoal = this.game.distance(this.getX(), this.getY(), goalTarget.getX(), goalTarget.getY())
      return distanceFromGoal < (Constants.tileSize * 2)
    } else {
      let platform = this.getStandingPlatform()
      if (!platform) return false

      return platform.getRow() === goalTarget.getRow() &&
             platform.getCol() === goalTarget.getCol()
    }
  }

  getCleanTimestampInterval() {
    let secondsInterval = Math.floor(this.getStats().reload / 1000)
    return secondsInterval * Constants.physicsTimeStep 
  }

  executeTurn() {
    if (this.isDormant) return

    this.findDirtyPlatformEveryInterval()
    this.cleanPlatform()
  }

  moveEntity(targetEntityToMove, deltaTime) {
    if (this.hasBehavior(Protocol.definition().BehaviorType.Clean)) return

    super.moveEntity(targetEntityToMove, deltaTime)
  }

  findDirtyChunkRegionAndPlatform() {
    let currChunkRegion = this.getChunkRegion()

    let availablePlatform

    let dirtyChunkRegion = this.sector.findOneChunkRegionUntil(currChunkRegion, {
      breakCondition: (chunkRegion) => {
        if (!chunkRegion.hasDirt()) return false

        let platforms = chunkRegion.getDirtyPlatforms()
        availablePlatform = platforms.find((platform) => { 
          return !platform.isClaimed()
        })

        return availablePlatform
      },
      neighborStopCondition: () => { return false }
    })

    return { chunkRegion: dirtyChunkRegion, platform: availablePlatform }

  }

  findNewGoal() {
    // dont do default goal finding
  }

  findDirtyPlatformGoal() {
    this.isFindingDirtInProgress = false
    if (this.hasBehavior(Protocol.definition().BehaviorType.Clean)) return null
    if (!this.owner) return null

    let targetPlatform

    if (this.activeChunkRegion && this.activeChunkRegion.isStale()) {
      this.activeChunkRegion = null
    }

    if (this.activeChunkRegion && this.activeChunkRegion.hasDirt()) {
      let dirtyPlatform = this.activeChunkRegion.getRandomDirtyPlatform()
      targetPlatform = dirtyPlatform
    } else {
      let result = this.findDirtyChunkRegionAndPlatform()
      this.activeChunkRegion = result.chunkRegion

      if (result.platform) {
        targetPlatform = result.platform
      }
    }

    if (!this.activeChunkRegion) return null
    if (!targetPlatform) return null

    this.goals.forEach((goal) => {
      goal.remove()
    })

    this.removeCleanTarget()

    this.addCleanTarget(targetPlatform)
    this.isWandering = false // needs this for some reason, 
                             // canReachGoal is delayed and can return false in first tick..

    // console.log("adding dirty platform goal: " + [targetPlatform.getRow(), targetPlatform.getCol()].join(","))
    let goal = this.addNonWanderingGoalTarget(targetPlatform)
    return goal
  }

}

module.exports = CleanBot
