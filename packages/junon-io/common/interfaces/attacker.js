const Constants = require("./../constants.json")
const Helper = require("./../helper")
const EventBus = require("eventbusjs")

const Attacker = () => {
}

Attacker.prototype = {
  initAttacker() {
    this.attackTarget = null
    this.attackRangeBoundingBox = null

    this.resetLastAttackTime()
    this.registerAttackerEventListeners()
  },

  registerAttackerEventListeners() {
    this.onAttackEntityRemovedListener = this.onAttackEntityRemoved.bind(this)
    EventBus.addEventListener(this.game.getId() + ":entity:removed", this.onAttackEntityRemovedListener)
  },

  unregisterAttackerEventListeners() {
    EventBus.removeEventListener(this.game.getId() + ":entity:removed", this.onAttackEntityRemovedListener)
  },

  deinitAttacker() {
    this.unregisterAttackerEventListeners()
  },

  onAttackEntityRemoved(event) {
    let entity = event.target

    if (this.desiredAttackTarget === entity) {
      this.desiredAttackTarget = null
    }

    if (this.attackTarget === entity) {
      this.attackTarget = null
    }

    this.onPostAttackEntityRemoved(event)
  },

  onPostAttackEntityRemoved(event) {
    // callback
  },

  onTargetOutOfRange() {
    // callback: attack target no longer in range
  },

  onDesiredTargetRemoved() {
    // callback: 
  },

  shouldRemoveDesiredAttackTargetOnOutOfRange() {
    return true
  },

  resetLastAttackTime() {
    const startupDelay = this.convertMillisecondToFrames(300)
    const attackInterval = this.convertMillisecondToFrames(this.getAttackInterval())

    this.lastAttackTime = this.game.timestamp - attackInterval + startupDelay
  },

  convertMillisecondToFrames(timeInMilliseconds) {
    const secondsPerMillisecond = 1/1000
    const framesPerSecond       = Constants.physicsTimeStep
    return timeInMilliseconds * secondsPerMillisecond * framesPerSecond
  },

  /*
    If we dont have attackTarget. Use LOS to find one

    Attacker visual range might be larger than attack range
    Lets find what we can attack within what we can see
  */
  examineLineOfSightRange() {
    if (this.attackTarget) return

    // if part of group, only let leader do this
    if (this.entityGroup && !this.entityGroup.isLeader(this)) return

    if (!this.desiredAttackTarget) {
      // no los target, lets find one
      let target = this.findLineOfSightTarget()
      if (target) {
        this.setDesiredAttackTarget(target)
      }
    } 
  },

  canAttack(target) {
    if (target.isInvisible() && !this.canAttackInvisible(target)) {
      return false
    }

    return !this.isFriendlyUnit(target) &&
           this.shouldChooseTarget(target) &&
           !target.isDestroyed() &&
           !target.isRemoved
  },

  canAttackInvisible() {
    return false
  },

  canAttackInFuture(target) {
    if (this.isChaser()) {
      return this.canAttack(target)
    } else {
      let condition = this.isWithinRange(target, this.getLineOfSightRange()) && 
                      this.canAttack(target)
      return condition
    }
  },

  isChaser() {
    return false
  },

  canImmediatelyAttack(target) {
    let shouldAttackIgnoreObstacle = this.getConstants().shouldAttackIgnoreObstacle

    let range = this.getAttackRange() 
    let condition = this.isWithinRange(target, range) && this.canAttack(target)

     if (shouldAttackIgnoreObstacle) {
       return condition
     } else {
       return condition && !this.isObstacleBlockingTarget(target, range)
     }
  },

  examineAttackRange() {
    if (!this.attackTarget) {
      if (!this.desiredAttackTarget) return

      // no attack target, lets see if we've moved closed enough to desired target
      if (this.canImmediatelyAttack(this.desiredAttackTarget)) {
        this.setAttackTarget(this.desiredAttackTarget)
      }
    } else {
      // attack target exist, check if its still within range
      if (!this.canImmediatelyAttack(this.attackTarget)) {
        this.setAttackTarget(null)
      }
    }
  },

  setDesiredAttackTarget(attackTarget) {
    if (this.desiredAttackTarget !== attackTarget) {
      // notify old removed
      if (this.desiredAttackTarget) {
        this.onDesiredTargetRemoved(this.desiredAttackTarget)
      }

      // make the change
      this.desiredAttackTarget = attackTarget

      // notify new added
      if (this.desiredAttackTarget) {
        this.onDesiredAttackTargetFound(this.desiredAttackTarget)
      }
    }

    if (this.entityGroup && this.entityGroup.isLeader(this)) {
      this.entityGroup.setDesiredAttackTarget(this.desiredAttackTarget)
    }
  },

  setAttackTarget(attackTarget) {
    if (attackTarget === null) {
      this.onTargetOutOfRange(this.attackTarget)
    }

    if (attackTarget) {
      this.onAttackTargetFound(attackTarget)
    }
    this.attackTarget = attackTarget
  },

  attackNearbyOpponents() {
    if (this.lastScanTargetsTime) {
      let duration = this.game.timestamp - this.lastScanTargetsTime
      if (duration < Constants.physicsTimeStep) {
        return
      }
    } 

    this.lastScanTargetsTime = this.game.timestamp

    if (this.shouldAttack()) {
      this.examineAttackRange()
      this.examineLineOfSightRange()
      this.examineLongRange()
      this.examineDesiredAttackTarget()

      this.attack()
    } else {
      this.setAttackTarget(null)      
    }
  },

  shouldAttack() {
    return true
  },

  examineLongRange() {

  },

  examineDesiredAttackTarget() {
    if (!this.desiredAttackTarget) {
      // if no los target, check entity group
      if (this.entityGroup && this.entityGroup.getDesiredAttackTarget()) {
        this.desiredAttackTarget = this.entityGroup.getDesiredAttackTarget()
        this.onDesiredAttackTargetFound(this.desiredAttackTarget)
      }
    }

    if (this.desiredAttackTarget) {
      // los target exist, check if its still within range and attackable
      if (!this.canAttackInFuture(this.desiredAttackTarget) &&
          this.shouldRemoveDesiredAttackTargetOnOutOfRange(this.desiredAttackTarget)) {
        this.setDesiredAttackTarget(null)
      }
    }
  },

  calculateDestination(attackTarget) {
    let destination = { x: attackTarget.getX(), y: attackTarget.getY() }

    if (attackTarget.isShield()) {
      destination = this.getShieldDestination(attackTarget)
    }

    return destination
  },

  getShieldDestination(attackTarget) {
    const distanceFromEnemy = this.game.distance(attackTarget.getX(), attackTarget.getY(), this.getX(), this.getY())
    const distanceFromShield = distanceFromEnemy - attackTarget.getRadius()
    const shieldPoint = this.game.lenpoint(this.getX(), this.getY(), attackTarget.getX(), attackTarget.getY(), distanceFromShield)
    return { x: shieldPoint[0], y: shieldPoint[1] }
  },

  onDesiredAttackTargetFound() {
    // override callback: desired enemy is found within LOS, but may need to approach before within attack range
  },

  onAttackTargetFound(attackTarget) {
    // override callback: desired enemy is now within attack range, and becomes currentAttackTarget
  },



  hasReachedAttackInterval() {
    const currentTime = this.game.timestamp
    const hasBeenIdle = currentTime - this.lastAttackTime > this.convertMillisecondToFrames(this.getAttackInterval())

    return hasBeenIdle
  },

  getAttackInterval() {
    throw new Error("must implement Attacker#getAttackInterval")
  },

  getLineOfSightRange() {
    return this.getAttackRange()
  },

  getAttackRange() {
    throw new Error("must implement Attacker#getAttackRange")
  },

  getAttackables() {
    throw new Error("must implement Attacker#getAttackables")
  },

  isFriendlyUnit(targetEntity) {
    if (!targetEntity.getAlliance()) return true // unowned things are friendly

    return this.getAlliance() === targetEntity.getAlliance()
  },

  getLineOfSightTargets(tree) {
    let hostileTargets = tree.search(this.getLineOfSightRangeBoundingBox())

    return hostileTargets.filter((target) => {
      return this.isWithinRange(target, this.getLineOfSightRange()) && this.canAttack(target)
    })
  },


  shouldChooseTarget(target) {
    return true
  },

  isObstacleBlockingTarget(target, range) {
    const obstacle = this.raycast(target, range)
    this.onRaycast(obstacle) // callback

    if (!obstacle) return false
    if (obstacle.entity === target) return false
    if (!obstacle.entity.isCollidable()) return false

    const attackerTargetDistance   = this.game.distance(target.getX(), target.getY(), this.getX(), this.getY())
    const attackerObstacleDistance = this.game.distance(obstacle.x, obstacle.y, this.getX(), this.getY())
    return attackerObstacleDistance < attackerTargetDistance
  },

  onRaycast(obstacle) {
    // callback
  },

  raycast(target, range) {
    let container = this.getContainer()
    let sourceX = container.isMovable() ? this.getRelativeX() : this.getX()
    let sourceY = container.isMovable() ? this.getRelativeY() : this.getY()
    let targetX = container.isMovable() ? target.getRelativeX() : target.getX()
    let targetY = container.isMovable() ? target.getRelativeY() : target.getY()
    let entityToIgnore = this

    return container.raycast(sourceX, sourceY, targetX, targetY, range, entityToIgnore)
  },

  isWithinRange(target, range) {
    const withinRange = Helper.testOverlap(this.getRangeCircle(range), target)
    const isSameSector = target.sector.id === this.sector.id
    return isSameSector && withinRange 
  },

  // sorted by distance limited to tree group. first trees have priority
  findLineOfSightTarget() {
    const targets = this.getAttackables().map((tree) => {
      let targetsInRange = this.getLineOfSightTargets(tree)

      return targetsInRange.sort((target, otherTarget) => {
        return this.game.calculateDistance(this, target) - this.game.calculateDistance(this, otherTarget)
      })
    }).flat()

    return this.applyTargetSelectionStrategy(targets)
  },

  applyTargetSelectionStrategy(targets) {
    return targets[0] || null
  },

  performAttack(attackTarget) {
    throw new Error("must implement Attacker#performAttack")
  },

  isStatic() {
    return false
  },

  attack() {
    if (!this.attackTarget) return
    if (!this.hasReachedAttackInterval()) return

    this.lastAttackTime = this.game.timestamp
    this.performAttack(this.attackTarget)
  },

  getRangeCircle(range) {
    return { x: this.getX() , y: this.getY() , radius: range }
  },

  getLineOfSightRangeBoundingBox() {
    if (!this.isStatic() || !this.lineOfSightRangeBoundingBox) {
      this.lineOfSightRangeBoundingBox = this.calculateLineOfSightRangeBoundingBox()
    }

    return this.lineOfSightRangeBoundingBox
  },

  getAttackRangeBoundingBox() {
    // if entity's position is dynamic or if attackRangeBoundingBox has never been calculated before
    if (!this.isStatic() || !this.attackRangeBoundingBox) {
      this.attackRangeBoundingBox = this.calculateAttackRangeBoundingBox()
    }

    return this.attackRangeBoundingBox
  },

  calculateAttackRangeBoundingBox() {
    var range = this.getAttackRange()

    var minX = this.getX() - range
    var maxX = this.getX() + range
    var minY = this.getY() - range
    var maxY = this.getY() + range

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  },

  calculateLineOfSightRangeBoundingBox() {
    var range = this.getLineOfSightRange()

    var minX = this.getX() - range
    var maxX = this.getX() + range
    var minY = this.getY() - range
    var maxY = this.getY() + range

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }




}

module.exports = Attacker

