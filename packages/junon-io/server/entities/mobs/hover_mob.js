const BaseMob = require("./base_mob")
const Constants = require('../../../common/constants.json')

class HoverMob extends BaseMob {

  getLineOfSightRange() {
    return this.getStats(this.getLevel()).los
  }

  isPathFindTargetReachable() {
    return true
  }

  triggerTraps() {
    // flying done trigger traps
  }

  moveEntity(targetEntityToMove, deltaTime) {
    if (this.isIdle) {
      if (this.game.timestamp > this.stopIdlingTime) {
        this.isIdle = false
      }

      return
    }

    if (this.attackTarget) { // stop immediately when already attacking
      let targetRadian = Math.atan2(this.attackTarget.getY() - targetEntityToMove.getY(), this.attackTarget.getX() - targetEntityToMove.getX())

      targetEntityToMove.steerTowardsAngle(targetRadian)


      let isClose = this.game.distanceBetween(this, this.attackTarget) <= Constants.tileSize
      let standingPlatform = this.getStandingPlatform()
      let isAboveWall = standingPlatform && standingPlatform.hasCategory("wall")
      
      if (!isAboveWall || isClose) {
        targetEntityToMove.stopMoving()
        return
      }
    }

    let goal = this.getLatestGoal()
    if (!goal) {
      if (this.desiredAttackTarget) {
        this.debugMobBehavior("[addNonWanderingGoalTarget] desiredAttackTarget but no goal: " + this.desiredAttackTarget.constructor.name + ":" + this.desiredAttackTarget.getId())
        goal = this.addNonWanderingGoalTarget(this.desiredAttackTarget)
      }
    }

    if (this.isWandering) {
      let shouldContinue = this.wanderAround(targetEntityToMove)
      if (!shouldContinue) return
    }

    if (!goal) {
      this.isWandering = true
      this.enterBasicWanderingMode()
      return
    }


    if (this.hasReachedGoal(goal)) {
      this.onGoalReached(targetEntityToMove, goal)
      return
    }

    if (!this.isGoalTargetValid(goal.getTargetEntity())) {
      this.debugMobBehavior("[removeGoal] moveEntity !isGoalTargetValid: " + goal.getTargetEntity().constructor.name + ":" + goal.getTargetEntity().getId())
      goal.remove()
    }

    let radian = this.game.angle(this.getX(), this.getY(), goal.getTargetEntity().getX(), goal.getTargetEntity().getY())

    targetEntityToMove.steerTowardsAngle(radian)

    let arriveForce = this.getForceFromAngle(radian)
    let separateForce = this.separate(this.getNeighbors())

    targetEntityToMove.applyForce(arriveForce)
    targetEntityToMove.applyForce(separateForce)
  }

  findLineOfSightTarget() {
    const targets = this.getAttackables().map((tree) => {
      let targetsInRange = this.getLineOfSightTargets(tree)

      return targetsInRange.sort((target, otherTarget) => {
        return this.game.calculateDistance(this, target) - this.game.calculateDistance(this, otherTarget)
      })
    }).flat()

    return this.applyTargetSelectionStrategy(targets)
  }

  shouldIgnoreObstacle() {
    return true
  }

  examineLongRange() {
    // only for raids
    if (!this.getRaid()) return
    if (this.entityGroup && !this.entityGroup.isLeader(this)) return
    if (this.desiredAttackTarget) return

    if (this.lastLongRangeCheckTime) {
      let duration = this.game.timestamp - this.lastLongRangeCheckTime
      if (duration < Constants.physicsTimeStep * 3) {
        return
      }
    } 

    this.lastLongRangeCheckTime = this.game.timestamp

    let raid = this.getRaid()
    for (let id in raid.team.ownerships.structures) {
      let structure = raid.team.ownerships.structures[id]
      if (this.canAttack(structure)) {
        this.setDesiredAttackTarget(structure)
        break
      }
    }

  }
}

module.exports = HoverMob
