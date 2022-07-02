const p2 = require("p2")
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const Movable = require('../../../common/interfaces/movable')
const Helper = require('../../../common/helper')
const BaseEntity = require('../base_entity')
const SocketUtil = require("junon-common/socket_util")

class BaseProjectile extends BaseEntity {
  static build(data) {
    return new this(data)
  }

  shouldRemoveImmediately() {
    return false
  }

  markForRemoval() {
    this.shouldRemove = true
    this.removeListeners()
  }

  constructor(data) {
    let sector = data.weapon ? data.weapon.sector : data.owner.sector
    super(sector, { id: data.id, x: data.source.x, y: data.source.y, w: data.w, h: data.h })

    this.weapon            = data.weapon
    this.sourceEntity      = data.weapon
    this.destinationEntity = data.destinationEntity

    if (data.keyValueMap) {
      this.customDamage   = data.keyValueMap.damage
      this.shouldHitFloor = data.keyValueMap.shouldHitFloor
    }

    this.owner       = data.owner ? data.owner : data.weapon.owner
    this.source      = data.source
    this.destination = data.destination

    let radian = Math.atan2(this.destination.y - this.source.y, this.destination.x - this.source.x)

    this.angle       = Math.floor(radian * (180 / Math.PI))
    this.chunksTraversed = {}

    this.speed       = this.getSpeed()
    this.postDeathCounter = 1 // give hitscan 3 ticks before completely removing so that client can receive projectile object, and render it for instant enemy kills
    this.isFreshSpawn = true

    this.initVariables()
    this.initMovable()

    if (!data.ignoreObstacles) {
      this.accountForObstacles()
    }

    this.distanceToCover = Helper.distance(this.source.x, this.source.y, this.destination.x, this.destination.y)
    this.lastPosition = [this.getX(), this.getY()]

    this.register()
    this.onProjectileConstructed()
    this.onStateChanged()
  }

  register() {
    this.sector.addProjectile(this)
    this.sector.insertEntityToTreeByName(this, "projectiles")
  }

  unregister() {
    this.sector.removeProjectile(this)
    this.sector.removeEntityFromTreeByName(this, "projectiles")
  }

  onProjectileConstructed() {

  }

  isObstructed(source, point) {
    let entityToIgnore = source
    let distance = this.game.distance(source.getX(), source.getY(), point[0], point[1]) 
    let hit = source.getContainer().raycast(source.getX(), source.getY(), point[0], point[1], distance, entityToIgnore)
    return hit
  }

  accountForObstacles() {
    let container = this.getContainer()
    let entityToIgnore = this
    let distance = this.game.distance(this.source.x, this.source.y, this.destination.x, this.destination.y) 

    let hit = container.raycast(this.source.x, this.source.y, this.destination.x, this.destination.y, distance, entityToIgnore)

    if (hit && hit.entity.isCollidableBuildingOrTerrain()) {
      let canDamageBuilding = hit.entity.isBuilding() && this.canDamage(hit.entity)
      if (canDamageBuilding) return
        
      this.destinationEntity = hit.entity
      if (hit.entity.shouldCollideEdge()) {
        this.destination = { x: hit.x, y: hit.y }
      } else {
        // hit center to ensure collision even
        this.destination = { x: hit.entity.getX(), y: hit.entity.getY() }
      }

    }

    // console.log(this.id + " bullet destination: " + JSON.stringify(this.destination))
  }

  getClosestHit(obstacles) {
    let hits = []
    hits = hits.concat(obstacles)

    return hits.sort((a, b) => {
      let distanceA =  this.game.distanceBetween(this, a.entity)
      let distanceB =  this.game.distanceBetween(this, b.entity)
      return distanceA - distanceB
    })[0]
  }

  getPlayer() {
    if (this.owner && this.owner.isPlayer()) return this.owner
    return null
  }

  getOwner() {
    return this.owner
  }

  cleanupAfterDelay() {
    if (this.postDeathCounter <= 0) {
      this.remove(this)
    }

    this.postDeathCounter -= 1
  }

  removeListeners() {

  }

  getContainer() {
    if (!this.owner) return this.sector
      
    return this.owner.ship || this.owner.container || this.sector
  }

  limitVerticalMovement() {
  }

  limitHorizontalMovement() {
  }


  remove() {
    super.remove()
    this.removeListeners()
    this.unregister()

    this.clientMustDelete = true

    // notify all traversed chunks that projectile is deleted..
    this.onStateChangedChunkTraversed()
  }

  onStateChangedChunkTraversed() {
    for (let chunkId in this.chunksTraversed) {
      let chunk = this.chunksTraversed[chunkId]
      chunk.addChangedProjectiles(this)
    }
  }

  hasPhysics() {
    return true
  }

  shouldDisableDelayMove() {
    return false
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }

    if (this.isFreshSpawn && !this.shouldDisableDelayMove()) {
      this.isFreshSpawn = false
      return
    }

    this.body.velocity[0] = this.getSpeed() * Math.cos(this.getRadAngle())
    this.body.velocity[1] = this.getSpeed() * Math.sin(this.getRadAngle())
  }

  getYFromX(radAngle, x1, y1, x) {
    const xp = 1 * Math.cos(radAngle)
    const yp = 1 * Math.sin(radAngle)

    const slope = yp/xp
    const b = y1 - slope * x1

    const y = slope * x + b
    return Math.floor(y)
  }

  getXFromY(radAngle, x1, y1, y) {
    const xp = 1 * Math.cos(radAngle)
    const yp = 1 * Math.sin(radAngle)

    const slope = yp/xp
    const b = y1 - slope * x1

    const x = (y - b) / slope
    return Math.floor(x)
  }

  normalizeOutOfBoundsAndRemove() {
    let maxWidth  = this.getContainer().getColCount() * Constants.tileSize
    let maxHeight = this.getContainer().getRowCount() * Constants.tileSize
    let targetX
    let targetY

    if (this.getX() < 0) {
      targetX = 0
      targetY = this.getYFromX(this.getRadAngle(), this.getX(), this.getY(), targetX)
      this.body.position[0] = targetX
      this.body.position[1] = targetY
      this.setXYFromBodyPosition()
    } else if (this.getX() > maxWidth) {
      targetX = maxWidth - 1
      targetY = this.getYFromX(this.getRadAngle(), this.getX(), this.getY(), targetX)
      this.body.position[0] = targetX
      this.body.position[1] = targetY
      this.setXYFromBodyPosition()
    } else if (this.getY() < 0) {
      targetY = 0
      targetX = this.getXFromY(this.getRadAngle(), this.getX(), this.getY(), targetY)
      this.body.position[0] = targetX
      this.body.position[1] = targetY
      this.setXYFromBodyPosition()
    } else if (this.getY() > maxHeight) {
      targetY = maxHeight - 1
      targetX = this.getXFromY(this.getRadAngle(), this.getX(), this.getY(), targetY)
      this.body.position[0] = targetX
      this.body.position[1] = targetY
      this.setXYFromBodyPosition()
    }

    this.remove(this)
  }
  
  onVelocitySetByPosition() {
    this.determineMovementComplete()
  }

  determineMovementComplete() {
    const distanceTravelled = Helper.distance(this.getX(), this.getY(), this.source.x, this.source.y)

    if (distanceTravelled >= this.distanceToCover) {
      this.onMoveComplete()
      return
    }
  }

  checkCollisions() {
    // nothing by default
  }

  onEdgeHit(entity, hit) {
    this.onMoveComplete()
  }

  onMoveComplete() {
    this.body.velocity[0] = 0
    this.body.velocity[1] = 0
    this.setPosition(this.destination.x, this.destination.y)

    this.remove()
  }

  canDamage(entity) {
    if (!entity) return false

    if (this.owner && this.owner.isPlayer() && !this.owner.canDamage(entity)) {
      return false
    }

    if (this.isFriendlyUnit(entity)) return false
    if (entity.isOwnedBy(this.owner)) return false
    if (entity.hasCategory("ghost")) return false

    const isWeaponDestroyed = this.owner && this.owner.isSector() 
    const isSelfHit = entity === this.owner || (isWeaponDestroyed && entity.isPlayer())
    const isUnownedBuilding = entity.isBuilding() && !entity.hasOwner()
    const isDistribution = entity.isDistribution()

    if (isSelfHit || isUnownedBuilding || isDistribution || !entity.setHealth) return false

    if (entity.hasCategory("trap")) return true
    if (entity.hasCategory("platform") && this.shouldHitFloor) return true
    if (!entity.isCollidable(this)) return false
    if (entity.isBuilding() && entity.getConstants().isPassable) return false

    return true
  }

  setPosition(x, y) {
    if (this.isRemoved) return

    super.setPosition(x, y)
  }

  setPositionFromVelocity() {
    if (this.isRemoved) return

    this.lastPosition = [this.getX(), this.getY()]

    super.setPositionFromVelocity()

    this.checkCollisions()
  }

  skipGravity() {
    return true
  }

  // should be in common
  initVariables() {
    this.state = 0
    this.type = this.getType()
  }

  getShape() {
    return new p2.Circle({
      radius: Math.round(this.getWidth() / 2)
    })
  }

  getAlliance() {
    if (this.owner) return this.owner.getAlliance()
    if (this.weapon) return this.weapon.getAlliance()
  }

  onCollide(entity) {
    // do nothing
  }

  getType() {
    throw new Error("must implement BaseProjectile#getType")
  }

  getCollisionMask() {
    return Constants.collisionGroup.Mob | Constants.collisionGroup.Building | Constants.collisionGroup.Player
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Projectile
  }

  getDamage(attackTarget) {
    if (this.customDamage) return this.customDamage

    if (this.weapon) {
      return this.weapon.getDamage(attackTarget)
    } else {
      if (this.owner && this.owner.isSector()) {
        return this.getConstants().damage
      } else {
        return this.owner.getDamage()
      }
    }
  }

  getRange() {
    return this.weapon ? this.weapon.getRange() : this.owner.getRange()
  }

  onStateChanged() {
    let chunk = this.getChunk()
    if (chunk) {
      this.chunksTraversed[chunk.id] = chunk
      chunk.addChangedProjectiles(this)
    }
  }

  canPierceMultipleTargets() {
    return !!this.getConstants().isPiercing
  }

  limitPositionToBounds() {
    // use its own out of bounds normalize from below
    return false
  }

  onPositionChanged(options = {}) {
    if (this.isOutOfBounds()) {
      return this.normalizeOutOfBoundsAndRemove()
    }

    this.repositionOnProjectileTree()

    if (options.isChunkPositionChanged) {
      SocketUtil.broadcast(this.sector.getSocketIds(), "ChunkPositionChanged", { row: options.chunkRow, col: options.chunkCol, entityId: this.getId() })
    }

    this.onStateChanged()
  }

  repositionOnProjectileTree() {
    this.getContainer().removeEntityFromTreeByName(this, "projectiles")
    this.getContainer().insertEntityToTreeByName(this, "projectiles")
  }

  getBodyProperties(x, y) {
    return {
        mass: 0,
        type: p2.Body.KINEMATIC,
        position: [x,y]
    }
  }

  // HACK: problem is sometimes for some reason weapons being used while in rail tram
  // need to give projectiles a relative X
  getRelativeX() {
    return this.getX()
  }

  getRelativeY() {
    return this.getY()
  }

}

Object.assign(BaseProjectile.prototype, Movable.prototype, {
  getSpeed() {
    return this.getConstants().speed * Constants.globalSpeedMultiplier
  }
})


module.exports = BaseProjectile
