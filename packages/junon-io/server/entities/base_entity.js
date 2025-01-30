const p2 = require("p2")
const Constants = require("./../../common/constants")
const vec2 = p2.vec2
const Helper = require('./../../common/helper')
const BaseTransientEntity = require('./base_transient_entity')
const BoundingBox = require("./../../common/interfaces/bounding_box")
const Taintable = require("./../../common/interfaces/taintable")
const Protocol = require('../../common/util/protocol')
const EventBus = require('eventbusjs')

class BaseEntity extends BaseTransientEntity {

  // x is middle of entity
  // y is middle of entity
  constructor(sector, data) {
    super(sector.game, data.id)
    this.sector = sector
    this.world = sector.game.world

    this.w = data.w
    this.h = data.h

    this.level = 0
    this.relativePosition = vec2.create()

    this.FIRE_GROW_RATE = debugMode ? 5 : 15
    this.FIRE_MANUAL_REDUCTION_RATE = debugMode ? 2 : 3

    if (this.hasPhysics()) {
      this.initPhysics(data.x, data.y)
      this.setXYFromBodyPosition()
    } else {
      this.x = Math.floor(data.x)
      this.y = Math.floor(data.y)
    }

    this.changedAttributes = {}

    this.onMoveListeners = []

  }

  hasFood() {
    return false
  }

  isEffectsChanged() {
    return this.changedAttributes["effects"]
  }

  isPVPEnabled() {
    return false
  }

  isCrop() {
    return false
  }

  getRowColBoundingBox(row, col) {
    let minX = col * Constants.tileSize
    let minY = row * Constants.tileSize
    let maxX = minX + Constants.tileSize
    let maxY = minY + Constants.tileSize

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  isLightBlocker() {
    return this.getConstants().isLightBlocker
  }

  getRegions() {
    let regions = this.sector.regionTree.search(this.getBoundingBox())
    if (regions.length === 0) return {}

    let result = {}

    for (var i = 0; i < regions.length; i++) {
      let region = regions[i]
      result[region.id] = region
    }

    return result
  }

  trackRegions() {
    let currRegions = this.getRegions()
    let prevRegions = this.regions

    for (let id in prevRegions) {
      let isOldRegionNoLongerPresent = !currRegions[id]
      if (isOldRegionNoLongerPresent) {
        let region = prevRegions[id]
        delete this.regions[id]
        region.onEntityLeave(this)
      }
    }

    for (let id in currRegions) {
      let isNotInPrevious = !prevRegions[id]
      if (isNotInPrevious) {
        let region = currRegions[id]
        this.regions[region.id] = region
        region.onEntityEnter(this)
      }
    }
  }

  getShootTarget(equipment, radian, customRange) {
    radian = radian || this.getRadAngle()

    let range = customRange || equipment.getRange()

    const xp = range * Math.cos(radian)
    const yp = range * Math.sin(radian)
    let target = {
      x: this.getX() + xp,
      y: this.getY() + yp
    }

    return target
  }

  isRepairable() {
    return false
  }

  claim(claimer) {
    this.sector.addClaim(this, claimer)
  }

  unclaim() {
    this.sector.removeClaim(this)
  }

  getAbsoluteRadAngle() {
    return this.getRadAngle() + this.getContainer().getRadAngle()
  }

  canPassEntity(entity) {

  }

  canBeInteracted() {
    return true
  }

  canTravelInSpace() {
    return this.isSkyCreature()
  }

  isSkyCreature() {
    return this.hasCategory("sky_creature")
  }

  isInventory() {
    return false
  }

  isMineable() {
    return false
  }

  interact(user) {
    // does nothing by default
  }

  isProjectile() {
    return this.getCollisionGroup() === Constants.collisionGroup.Projectile
  }

  setIsKnocked(isKnocked) {
    this.isKnocked = isKnocked

    if (isKnocked) {
      this.lastKnockedTime = this.game.timestamp
    }
  }

  isKnockExpired() {
    if (!this.lastKnockedTime) return true

    let twoSeconds = Constants.physicsTimeStep * 2

    return (this.game.timestamp - this.lastKnockedTime) > twoSeconds
  }

  getMeleeTarget(meleeRange, options = {}) {
    let targets = this.getMeleeTargets(meleeRange, options)

    let closestTarget = targets.sort((a, b) => {
      let distanceA = this.game.distanceBetween(this, a)
      let distanceB = this.game.distanceBetween(this, b)
      return distanceA - distanceB
    })[0]

    return closestTarget
  }

  getMeleeTargets(meleeRange, options = {}) {
    // get weapon center (near right arm of player)
    let xp = meleeRange * Math.cos(this.getRadAngle()) // 45degrees
    let yp = meleeRange * Math.sin(this.getRadAngle())
    const radius = options.attackRadius || Constants.tileSize

    if (options['anchorCenter']) {
      xp = 0
      yp = 0
    }

    const meleeCircle = { x: this.getX() + xp, y: this.getY() + yp, radius: radius }

    if (process.env.DEBUG_COLLISION) {
      if (this.isPlayer()) {
        this.getSocketUtil().emit(this.getSocket(), "CircleCollision", { circles: [meleeCircle] })
      }
    }

    const broadphaseRange = Constants.tileSize * 5
    const meleeBox = this.getNeighborBoundingBox(broadphaseRange)
    let attackables = options.attackables || this.getAttackables()

    if (options.additionalAttackables) {
      attackables = attackables.concat(options.additionalAttackables)
    }

    return attackables.map((tree) => {
      let broadphaseTargets = tree.search(meleeBox)
      return broadphaseTargets.filter((target) => {
        let isCircleOverlap = Helper.testOverlap(meleeCircle, target)

        let isNotSelf = target !== this
        let canDamage = this.canDamage(target)

        let isValidForTarget = isNotSelf &&
          isCircleOverlap &&
          canDamage &&
          !this.isObstructed(target) &&
          target.health > 0

        return isValidForTarget
      })
    }).flat()
  }

  canDamage(target) {
    return true
  }

  isObstructed(target) {
    let entityToIgnore = this
    let distance = this.game.distance(this.getX(), this.getY(), target.getX(), target.getY())
    let hit = this.getContainer().raycast(this.getX(), this.getY(), target.getX(), target.getY(), distance, entityToIgnore)
    if (hit && hit.entity === target) return false

    return hit
  }

  getRandomOffset(size) {
    return size - Math.floor(Math.random() * size * 2)
  }

  getThrowSpot(x, y) {
    let throwSpot
    let neighborHits = this.getSector().roomManager.getSideHitsFor({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1 })

    let validSpots = neighborHits.filter((hit) => {
      if (!hit) return false
      if (!hit.entity) return true
      return hit.entity.isGround()
    })

    if (validSpots.length === 0) {
      throwSpot = {
        x: x + this.getRandomOffset(8),
        y: y + this.getRandomOffset(8)
      }
    } else {

      throwSpot = {
        x: validSpots[0].col * Constants.tileSize + this.getRandomOffset(8),
        y: validSpots[0].row * Constants.tileSize + this.getRandomOffset(8)
      }
    }

    let padding = 1
    throwSpot.x = this.sector.normalizePosition(throwSpot.x, padding)
    throwSpot.y = this.sector.normalizePosition(throwSpot.y, padding)

    return throwSpot
  }

  findExplosionTargets(explosion) {
    let targets = this.getAttackables().map((tree) => {
      return tree.search(explosion.getBoundingBox())
    }).flat().filter((entity) => {
      return this.canDamage(entity)
    })

    // for each target, raycast to it, if there's a wall in between, then dont include target
    return targets.filter((entity) => {
      let container = this.getContainer()

      let distance = this.game.distance(this.getX(), this.getY(), entity.getX(), entity.getY())
      let entityToIgnore = this
      let obstacles = container.getRaycastObstacles(this.getX(), this.getY(), entity.getX(), entity.getY(), distance, entityToIgnore)
      let hasWallDoorInBetween = obstacles.find((hit) => {
        return (hit.entity.hasCategory("wall") || hit.entity.hasCategory("door")) &&
          hit.entity !== entity
      })

      return !hasWallDoorInBetween
    })
  }



  throwInventory(item) {
    item.owner = this.sector

    if (this.ship) {
      let spot = this.getThrowSpot(this.getRelativeX(), this.getRelativeY())
      let data = {
        x: spot.x,
        y: spot.y,
        item: item
      }

      this.ship.createPickup(data)
    } else {
      let spot = this.getThrowSpot(this.getX(), this.getY())
      let data = {
        x: spot.x,
        y: spot.y,
        item: item
      }

      this.sector.createPickup(data)
    }
  }


  isDistribution() {
    return false
  }

  getOwner() {
    return this.owner
  }

  getOwnerName() {
    if (!this.owner) return ""
    return this.owner.name
  }

  hasOwner() {
    return !!this.owner
  }

  damage() {
    // cant be damaged by default
  }

  resetVerticalVelocity(body, obstacle, hit) {
    if (body.velocity[1] > 0) {
      this.canJump = true;
    }
    if (obstacle) {
      if (obstacle.shouldObstruct(body, hit)) {
        this.edgifyBodyPositionVertical(obstacle, hit)
        this.onEdgeHit(obstacle, hit)
        body.velocity[1] = 0
      }
    } else {
      this.edgifyBodyPositionVertical(obstacle, hit)
      this.onEdgeHit(obstacle, hit)
      body.velocity[1] = 0
    }
  }

  isOwnedBy(user) {
    if (!user) return false

    if (this.isPlayer()) {
      return false
    }

    if (user.isPlayer()) {
      return user.hasOwnership(this)
    } else {
      return this.owner === user
    }
  }

  onButcherFinished() {

  }

  isOutOfBounds() {
    let maxWidth = this.getContainer().getColCount() * Constants.tileSize
    let maxHeight = this.getContainer().getRowCount() * Constants.tileSize

    return this.getX() < 0 || this.getX() > maxWidth ||
      this.getY() < 0 || this.getY() > maxHeight
  }

  resetHorizontalVelocity(body, obstacle, hit) {
    const isObstacleSolid = obstacle
    if (isObstacleSolid) {
      if (obstacle.shouldObstruct(body, hit)) {
        this.edgifyBodyPositionHorizontal(obstacle, hit)
        this.onEdgeHit(obstacle, hit)

        body.velocity[0] = 0
      }
    } else {
      this.edgifyBodyPositionHorizontal(obstacle, hit)
      this.onEdgeHit(obstacle, hit)

      body.velocity[0] = 0
    }
  }

  //   edgifyBodyPositionHorizontal(obstacle) {
  //     let col = obstacle.getCol()
  //     if (this.body.velocity[0] < 0) { // going left
  //       this.body.position[0] = (col + 1) * Constants.tileSize + (this.getWidth() / 2)
  //     } else if (this.body.velocity[0] > 0) { // going right
  //       this.body.position[0] = col       * Constants.tileSize - (this.getWidth() / 2)
  //     }
  //   }
  //
  //   edgifyBodyPositionVertical(obstacle) {
  //     let row = obstacle.getRow()
  //     if (this.body.velocity[1] > 0) { // going up
  //       this.body.position[1] = row       * Constants.tileSize - (this.getHeight() / 2)
  //     } else if (this.body.velocity[1] < 0) { // going down
  //       this.body.position[1] = (row + 1) * Constants.tileSize + (this.getHeight() / 2)
  //     }
  //   }


  onVelocitySetByPosition() {
    // callback
  }

  limitPositionToBounds() {
    let isLimited = false

    if (this.body.position[0] < 0) {
      this.body.position[1] = 0
      isLimited = true
    }

    if (this.body.position[1] < 0) {
      this.body.position[1] = 0
      isLimited = true
    }

    if (this.body.position[0] > this.getSector().getGridWidth()) {
      this.body.position[0] = this.getSector().getGridWidth()
      isLimited = true
    }

    if (this.body.position[1] > this.getSector().getGridHeight()) {
      this.body.position[1] = this.getSector().getGridHeight()
      isLimited = true
    }

    return isLimited
  }

  setPositionFromVelocity() {
    if (this.isRemoved) return

    const prevGrid = { row: this.getRow(), col: this.getCol() }
    const prevChunk = { row: this.getChunkRow(), col: this.getChunkCol() }

    vec2.add(this.body.position, this.body.position, this.body.velocity)

    // if (this.body.force[0] && this.constructor.name === 'Player') {
    //   let pos = [this.body.position[0], this.body.position[1]].join("-")
    //   console.log(`force: ${this.body.force[0]} , velocity: ${this.body.velocity[0]} , pos: ${pos} `)
    // }
    //

    let isLimited = this.limitPositionToBounds()
    if (isLimited) {
      this.body.velocity[0] = 0
      this.body.velocity[1] = 0
    }

    this.setXYFromBodyPosition()
    this.body.aabbNeedsUpdate = true

    this.onVelocitySetByPosition()

    const currGrid = { row: this.getRow(), col: this.getCol() }
    const currChunk = { row: this.getChunkRow(), col: this.getChunkCol() }
    const isVelocityPresent = this.body.velocity[0] !== 0 || this.body.velocity[1] !== 0
    if (isVelocityPresent) {
      let isGridPositionChanged = currGrid.row !== prevGrid.row || currGrid.col !== prevGrid.col
      let isChunkPositionChanged = currChunk.row !== prevChunk.row || currChunk.col !== prevChunk.col
      this.onPositionChanged({
        isGridPositionChanged: isGridPositionChanged,
        isChunkPositionChanged: isChunkPositionChanged,
        chunkRow: currChunk.row,
        chunkCol: currChunk.col
      })
      this.emitMoveListeners()
    }
  }

  setXYFromBodyPosition() {
    this.x = Math.floor(this.body.position[0])
    this.y = Math.floor(this.body.position[1])
  }

  getSpeed() {
    return 0
  }

  getMaxSpeed() {
    return this.getSpeed()
  }

  getMaxSpeedFromForce() {
    return this.getSpeed()
  }

  sendEquipmentAnimation() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.sendEquipmentAnimation(this)
    }
  }

  stopEquipmentAnimation() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.stopEquipmentAnimation(this)
    }
  }

  getChunkRegion() {
    let chunk = this.getChunk()
    if (!chunk) return null
    return chunk.getChunkRegion(this.getRow(), this.getCol())
  }

  getContinent() {
    let chunkRegion = this.getChunkRegion()
    if (!chunkRegion) return null
    return chunkRegion.getContinent()
  }

  getChunkRegions() {
    let chunkRegions = {}

    this.forEachOccupiedTile((row, col) => {
      let chunkRegionsAtRowCol = this.sector.getChunkRegionsAt(row, col)
      for (let chunkRegionId in chunkRegionsAtRowCol) {
        let chunkRegion = chunkRegionsAtRowCol[chunkRegionId]
        chunkRegions[chunkRegionId] = chunkRegion
      }
    })

    return chunkRegions
  }

  forEachOccupiedTile(cb) {
    let topLeftRow = this.getTopLeftRow()
    let topLeftCol = this.getTopLeftCol()
    let rowCount = 2 // bottomRight
    let colCount = 2 // bottomRight

    for (let row = topLeftRow; row < topLeftRow + rowCount; row++) {
      for (let col = topLeftCol; col < topLeftCol + colCount; col++) {
        cb(row, col)
      }
    }
  }

  getTopLeftRow() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.y) / Constants.tileSize)
  }

  getTopLeftCol() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.x) / Constants.tileSize)
  }

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  }

  // for entities that can occupy more than 1 chunk (ie. rooms)
  // or buildings larger than 1x1
  getChunks() {
    let boundingBox = this.getBoundingBox()
    return Helper.getChunksFromBoundingBox(this.sector, boundingBox)
  }

  getChunkRow() {
    const chunkSize = Constants.chunkRowCount * Constants.tileSize
    return Math.floor(this.getY() / chunkSize)
  }

  getChunkCol() {
    const chunkSize = Constants.chunkRowCount * Constants.tileSize
    return Math.floor(this.getX() / chunkSize)
  }

  setRelativePositionFromVelocity() {
    vec2.add(this.relativePosition, this.relativePosition, this.body.velocity)
    this.relativeX = Math.floor(this.relativePosition[0])
    this.relativeY = Math.floor(this.relativePosition[1])

    // we dont emit move listeners since we still need to call setPositionFromParent for the actual absolutePosition to be calculated
  }

  setPositionInternal(x, y) {
    if (this.hasPhysics()) {
      this.body.position[0] = x
      this.body.position[1] = y
      this.setXYFromBodyPosition()
      this.body.aabbNeedsUpdate = true
    } else {
      this.x = Math.floor(x)
      this.y = Math.floor(y)
    }

  }

  warp(x, y) {
    if (this.lastWarpTimestamp === this.game.timestamp) {
      return
    }

    this.setPosition(x, y)

    this.lastWarpTimestamp = this.game.timestamp
  }

  setPosition(x, y) {
    const prevChunk = { row: this.getChunkRow(), col: this.getChunkCol() }

    this.setPositionInternal(x, y)

    const currChunk = { row: this.getChunkRow(), col: this.getChunkCol() }

    let isChunkPositionChanged = currChunk.row !== prevChunk.row || currChunk.col !== prevChunk.col
    this.onPositionChanged({
      isGridPositionChanged: true,
      isChunkPositionChanged: isChunkPositionChanged,
      chunkRow: currChunk.row,
      chunkCol: currChunk.col
    })
  }

  onPositionChanged() {

  }

  setRelativePosition(x, y) {
    this.relativePosition[0] = x
    this.relativePosition[1] = y

    this.relativeX = Math.floor(x)
    this.relativeY = Math.floor(y)
  }


  lerp(factor, start, end) {
    return start + (end - start) * factor
  }

  setAngle(angle) {
    let roundedAngle = Math.floor(angle)
    if (this.angle !== roundedAngle) {
      this.angle = roundedAngle
      this.onAngleChanged()
    }
  }

  getAngle() {
    return this.angle
  }

  getRadAngle() {
    return this.angle * (Math.PI / 180)
  }

  onAngleChanged() {
    this.onStateChanged("angle")
  }


  limitVerticalMovement() {
    this.limitVerticalVelocityAndPosition([this.sector.groundMap], this.body, this.body.position)

  }

  limitHorizontalMovement() {
    this.limitHorizontalVelocityAndPosition([this.sector.groundMap], this.body, this.body.position)
  }

  applyGravity() {
  }

  applyVelocityAdjustment() {
    if (this.velocityAdjustmentX) {
      this.body.velocity[0] = this.velocityAdjustmentX
      this.velocityAdjustmentX = null
    }
  }

  shouldIgnoreObstacle() {
    return false
  }

  getVerticallyBumpedTile(grids, body, position) {
    let total = { hit: null, hits: null }
    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let result = grid.getVerticallyBumpedTile(body.velocity, position, body.entity.getObstacleCollisionWidth(), body.entity.getObstacleCollisionHeight())
      if (result.hit && !total.hit) {
        total.hit = result.hit
      }

      if (!total.hits) {
        total.hits = result.hits
      } else {
        for (var index = 0; index < result.hits.length; index++) {
          let hit = result.hits[index]
          if (hit.entity && !total.hits[index].entity) {
            total.hits[index] = hit
          }
        }
      }
    }

    return total
  }

  getHorizontallyBumpedTile(grids, body, position) {
    let total = { hit: null, hits: null }

    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let result = grid.getHorizontallyBumpedTile(body.velocity, position, body.entity.getObstacleCollisionWidth(), body.entity.getObstacleCollisionHeight())
      if (result.hit && !total.hit) {
        total.hit = result.hit
      }

      if (!total.hits) {
        total.hits = result.hits
      } else {
        for (var index = 0; index < result.hits.length; index++) {
          let hit = result.hits[index]
          if (hit.entity && !total.hits[index].entity) {
            total.hits[index] = hit
          }
        }
      }
    }

    return total
  }

  limitVerticalVelocityAndPosition(grids, body, position) {
    const isBodyMovingVertically = body.velocity[1] !== 0

    if (isBodyMovingVertically) {
      const result = this.getVerticallyBumpedTile(grids, body, position)
      let tileHit = result.hit
      if (!tileHit) return

      let isGoingOutofBounds = !result.hit.entity
      if (isGoingOutofBounds) {
        this.resetVerticalVelocity(body, tileHit.entity, tileHit)
        return
      }

      if (tileHit.entity && tileHit.entity.isBuilding() && tileHit.entity.isConstructionInProgress()) {
        return
      }

      if (this.shouldIgnoreObstacle()) return

      if (process.env.DEBUG_COLLISION) {
        let otherBox
        if (tileHit.entity) {
          otherBox = tileHit.entity.getBox()
        } else {
          otherBox = {
            pos: {
              x: grids[0].container.getGridRulerTopLeft().x + tileHit.col * Constants.tileSize,
              y: grids[0].container.getGridRulerTopLeft().y + tileHit.row * Constants.tileSize,
            },
            w: Constants.tileSize,
            h: Constants.tileSize
          }
        }

        let box = this.getBox()
        box.pos.x = Math.floor(box.pos.x)
        box.pos.y = Math.floor(box.pos.y)
        this.getSocketUtil().broadcast(this.sector.getSocketIds(), "CollisionDetected", { sourceBox: box, otherBox: otherBox })
      }

      let isMovingVertically = Math.floor(body.velocity[1]) !== 0
      let sliderSpeed = 2

      if (tileHit.entity && !tileHit.entity.shouldObstruct(body, tileHit)) {
        return
      }

      this.onObstructed(tileHit)

      if (isMovingVertically &&
        (this.isPlayer() || this.isMob())) {
        let normalizedHorizontalVelocity = Math.floor(body.velocity[0] * 100)
        if (normalizedHorizontalVelocity < 0) {
          // moving left
          if (this.hasOpenSpace(result.hits[0])) {
            this.velocityAdjustmentX = -sliderSpeed
          }
        } else if (normalizedHorizontalVelocity > 0) {
          // moving right
          if (this.hasOpenSpace(result.hits[2])) {
            this.velocityAdjustmentX = sliderSpeed
          }
        } else {
          // neutral
          if (this.hasOpenSpace(result.hits[0])) {
            this.velocityAdjustmentX = -sliderSpeed
          } else if (this.hasOpenSpace(result.hits[2])) {
            this.velocityAdjustmentX = sliderSpeed
          }
        }
      }

      this.resetVerticalVelocity(body, tileHit.entity, tileHit)
    }
  }

  limitHorizontalVelocityAndPosition(grids, body, position) {
    const isBodyMovingHorizontally = body.velocity[0] !== 0

    if (isBodyMovingHorizontally) {
      const result = this.getHorizontallyBumpedTile(grids, body, position)
      const tileHit = result.hit
      if (!tileHit) return

      let isGoingOutofBounds = !result.hit.entity
      if (isGoingOutofBounds) {
        this.resetHorizontalVelocity(body, tileHit.entity, tileHit)
        return
      }

      if (tileHit.entity && tileHit.entity.isBuilding() && tileHit.entity.isConstructionInProgress()) {
        return
      }

      if (this.shouldIgnoreObstacle()) return

      if (process.env.DEBUG_COLLISION) {

        let otherBox
        if (tileHit.entity) {
          otherBox = tileHit.entity.getBox()
        } else {
          otherBox = {
            pos: {
              x: grids[0].container.getGridRulerTopLeft().x + tileHit.col * Constants.tileSize,
              y: grids[0].container.getGridRulerTopLeft().y + tileHit.row * Constants.tileSize,
            },
            w: Constants.tileSize,
            h: Constants.tileSize
          }
        }

        let box = this.getBox()
        box.pos.x = Math.floor(box.pos.x)
        box.pos.y = Math.floor(box.pos.y)
        this.getSocketUtil().broadcast(this.sector.getSocketIds(), "CollisionDetected", { sourceBox: box, otherBox: otherBox })
      }

      let sliderSpeed = 2
      let isMovingHorizontally = Math.floor(body.velocity[0]) !== 0

      if (tileHit.entity && !tileHit.entity.shouldObstruct(body, tileHit)) {
        return
      }

      this.onObstructed(tileHit)

      if (isMovingHorizontally &&
        !isGoingOutofBounds &&
        (this.isPlayer() || this.isMob())) {
        let normalizedVerticalVelocity = Math.floor(body.velocity[1] * 100)
        if (normalizedVerticalVelocity < 0) {
          // going up
          if (this.hasOpenSpace(result.hits[0])) {
            this.carryOverVerticalSpeed = -sliderSpeed
          }
        } else if (normalizedVerticalVelocity > 0) {
          // going down
          if (this.hasOpenSpace(result.hits[2])) {
            this.carryOverVerticalSpeed = sliderSpeed
          }
        } else {
          // neutral
          if (this.hasOpenSpace(result.hits[0])) {
            this.carryOverVerticalSpeed = -sliderSpeed
          } else if (this.hasOpenSpace(result.hits[2])) {
            this.carryOverVerticalSpeed = sliderSpeed
          }
        }
      }

      this.resetHorizontalVelocity(body, tileHit.entity, tileHit)
    }

  }

  integratePreviousVerticalSpeed() {
    if (this.carryOverVerticalSpeed) {
      this.body.velocity[1] = this.carryOverVerticalSpeed
      this.carryOverVerticalSpeed = 0
    }
  }

  hasOpenSpace(hit) {
    if (!hit.entity) return true
    if (hit.entity.isTerrain()) {
      return !hit.entity.isForegroundTile()
    }

    if (hit.entity.hasCategory('door')) {
      return hit.entity.isOpen
    }

    return false
  }

  onEdgeHit(obstacle, hit) {

  }

  onObstructed(hit) {

  }

  getPaddedRelativeBox() {
    let box = this.getRelativeBox()

    return {
      pos: {
        x: box.pos.x - Constants.tileSize,
        y: box.pos.y - Constants.tileSize
      },
      w: box.w + Constants.tileSize * 2,
      h: box.h + Constants.tileSize * 2
    }
  }

  stopMoving() {
    this.body.force[0] = 0
    this.body.force[1] = 0
    this.body.velocity[0] = 0
    this.body.velocity[1] = 0
  }

  edgifyBodyPositionHorizontal(obstacle, tileHit) {
    let body = this.body
    if (tileHit.entity === null) return
    const otherBox = this.getTileBoxForEdgify(tileHit)
    const position = this.getPositionToEdgify(body)
    if (body.velocity[0] < 0) { // going left
      position[0] = otherBox.pos.x + otherBox.w + + body.entity.getWidth() / 2
    } else if (body.velocity[0] > 0) { // going right
      position[0] = otherBox.pos.x - body.entity.getWidth() / 2
    }

    this.postEdgify(body)
  }

  edgifyBodyPositionVertical(obstacle, tileHit) {
    let body = this.body
    if (tileHit.entity === null) return
    const otherBox = this.getTileBoxForEdgify(tileHit)
    const position = this.getPositionToEdgify(body)
    if (body.velocity[1] < 0) { // going up
      position[1] = otherBox.pos.y + otherBox.h + body.entity.getHeight() / 2
    } else if (body.velocity[1] > 0) { // going down
      position[1] = otherBox.pos.y - body.entity.getHeight() / 2 // we're setting center of body, so accomodate its on width/height
    }

    this.postEdgify(body)
  }

  postEdgify(body) {
    body.aabbNeedsUpdate = true
  }

  getTileBoxForEdgify(tileHit) {
    return {
      pos: {
        x: tileHit.col * Constants.tileSize,
        y: tileHit.row * Constants.tileSize
      },
      w: Constants.tileSize,
      h: Constants.tileSize
    }
  }

  getCollisionBox() {
    return this.getRelativeBox()
  }

  getPositionToEdgify(body) {
    return body.position
  }

  isOnLand() {
    return !!this.getStandingPlatform()
  }

  getLand() {
    return this.sector.getLand(this.getRow(), this.getCol())
  }

  steerTowardsAngle(radian) {
    const targetAngle = radian - this.getDirectionRadianModifier()
    const angleDelta = Helper.angleDeltaSigned(targetAngle, this.getRadAngle())
    const allowableAngleDelta = this.getTurnSpeed() > Math.abs(angleDelta) ? angleDelta : this.getTurnSpeed() * Math.sign(angleDelta)
    const degDelta = Math.floor(allowableAngleDelta * (180 / Math.PI))
    this.angle += degDelta
    this.onAngleChanged()
  }

  applyVelocity(targetVelocity, deltaTime) {
    // force decreases overtime
    // move increases force

    // let velocity = force * acceleration
    // this.body.velocity = targetVelocity
    // this.lerpVelocity(targetVelocity, deltaTime)
  }

  canDamageWalls() {
    return this.getConstants().canDamageWalls
  }

  getBodyVelocity() {
    if (!this.body) return [0, 0]
    return this.body.velocity
  }

  isMoving() {
    return vec2.length(this.body.velocity) > 0
  }

  lerpVelocity(targetVelocity, deltaTime) {
    const velocityMin = 0.1
    const accelerationTimeGrounded = 0.5
    const smoothing = 0.2 * accelerationTimeGrounded

    const factor = 1 - Math.pow(smoothing, deltaTime)
    this.body.velocity[0] = this.lerp(factor, this.body.velocity[0], targetVelocity[0])
    this.body.velocity[1] = this.lerp(factor, this.body.velocity[1], targetVelocity[1])
    console.log("lerp velocity: targetVelocity: " + JSON.stringify(targetVelocity) + " velocity: " + JSON.stringify(this.body.velocity) + " , factor: " + factor)

    // min velocity
    if (Math.abs(this.body.velocity[0]) < velocityMin) this.body.velocity[0] = 0
    if (Math.abs(this.body.velocity[1]) < velocityMin) this.body.velocity[1] = 0
  }

  getDirectionRadianModifier() {
    return 0
  }

  isMovable() {
    return false
  }

  isShield() {
    return false
  }

  isShip() {
    return false
  }

  getAlliance() {
    return this
  }

  isTower() {
    return false
  }

  resetFlags() {

  }

  getBody() {
    return this.body
  }

  isDestroyable() {
    return false
  }

  onWorldPostStep() {
    // does nothing by default
  }

  applyForce(force) {
    this.body.applyForce(force)
  }

  decreaseForce() {
    if (vec2.len(this.body.force) < 0.1) {
      this.body.force[0] = 0
      this.body.force[1] = 0
      this.disableCustomVelocity()
    } else {
      vec2.scale(this.body.force, this.body.force, 0.80)
    }
  }

  repositionOnUnitMap() {
    this.removeFromUnitMap()
    this.getSector().unitMap.registerToCollection(this.getRelativeBox(), this)
    this.prevRelativeBox = this.getRelativeBox()
  }

  removeFromUnitMap() {
    if (this.prevRelativeBox) {
      this.getSector().unitMap.unregisterFromCollection(this.prevRelativeBox, this)
    }
  }

  getName() {
    return [this.constructor.name, this.getId()].join(" ")
  }

  getRelativeBox() {
    if (!this.getContainer().isMovable()) {
      return this.getBox(this.getX(), this.getY(), this.getWidth(), this.getHeight())
    } else {
      return this.getBox(this.getRelativeX(), this.getRelativeY(), this.getWidth(), this.getHeight())
    }
  }

  getRow() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.y + box.h / 2) / Constants.tileSize)
  }

  getCol() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.x + box.w / 2) / Constants.tileSize)
  }

  getAbsoluteRow() {
    return Math.floor(this.getY() / Constants.tileSize)
  }

  getAbsoluteCol() {
    return Math.floor(this.getX() / Constants.tileSize)
  }

  getCoord() {
    return [this.getRow(), this.getCol()]
  }

  isTerrain() {
    return false
  }

  getFlowField() {
    let pathFinder = this.getContainer().pathFinder
    if (!pathFinder) return null

    return pathFinder.getFlowField(this)
  }

  removeFlowField() {
    let flowField = this.getFlowField()
    if (flowField) {
      flowField.remove()
    }
  }

  getContainer() {
    return this.container || this.ship || this.sector
  }

  updateFlowFieldsForSelf() {
    let pathFinder = this.getContainer().pathFinder
    if (!pathFinder) return

    pathFinder.updateFlowFieldForEntity(this)
  }

  // by default, quick slowdown, increase value for longer slowdown (i.e 0.99)
  dampenVelocity(factor = 0.8) {
    if (vec2.length(this.body.velocity) < 0.1) {
      this.body.velocity[0] = 0
      this.body.velocity[1] = 0
    } else {
      vec2.scale(this.body.velocity, this.body.velocity, factor)
    }
  }

  initPhysics(x, y) {
    // Create an infinite ground plane body
    this.body = new p2.Body(this.getBodyProperties(x, y))

    this.body.entity = this


    this.shape = this.getShape()
    this.shape.collisionGroup = this.getCollisionGroup()
    this.shape.collisionMask = this.getCollisionMask()

    this.addShape()
    this.addBodyToWorld()
  }

  addShape() {
    this.body.addShape(this.shape)
  }

  addBodyToWorld() {
    this.world.addBody(this.body)
  }

  getSafeRelativeX() {
    if (this.getContainer().isMovable()) return this.getRelativeX()
    return this.getX()
  }

  getSafeRelativeY() {
    if (this.getContainer().isMovable()) return this.getRelativeY()
    return this.getY()
  }

  hasPhysics() {
    return false
  }

  shouldUseP2Collisions() {
    return false
  }

  setContainer(container) {
    this.container = container
  }

  setPositionFromParent() {
    const x = this.getX()
    const y = this.getY()

    const isPositionChanged = this.isPositionChanged(x, y)

    this.setPosition(x, y)

    if (isPositionChanged) {
      this.emitMoveListeners()
    }
  }

  isPositionChanged(x, y) {
    return (this.x !== Math.floor(x) || this.y !== Math.floor(y))
  }

  isGround() {
    return this.hasCategory("platform") || this.isGroundTile()
  }

  isCollidable() {
    return true
  }

  isCollidableBuildingOrTerrain() {
    return this.isBuilding() && this.isCollidable()
  }

  shouldCollideEdge() {
    return false
  }

  hasBlood() {
    return !!this.getConstants().hasBlood
  }

  spillBlood() {
    let platforms = this.getNeighborPlatforms().concat([this.getStandingPlatform()])
    let index = Math.floor(Math.random() * platforms.length)
    let platform = platforms[index]
    if (!platform) return

    let shouldSpillBlood = !platform.isUndergroundTile() && Math.random() < this.getBloodSpillChance()
    if (shouldSpillBlood) {
      platform.addBlood()
    }
  }

  getBloodSpillChance() {
    return 0.90
  }

  getNeighborPlatforms() {
    if (!this.getContainer().platformMap) return []

    return this.getContainer().platformMap.getNeighbors(this.getRow(), this.getCol())
      .map((hit) => {
        return hit.entity
      })
  }

  getNeighborGrounds() {
    if (!this.getContainer().groundMap) return []

    return this.getContainer().groundMap.getNeighbors(this.getRow(), this.getCol())
      .map((hit) => {
        return hit.entity
      })
  }

  getNeighborReachableTileForRoom(room) {
    let grounds = this.getNeighborGrounds()
    let platforms = this.getNeighborPlatforms()

    let result

    for (var i = 0; i < platforms.length; i++) {
      let platform = platforms[i]
      if (platform && platform.getRoom() === room) {
        result = platform
        break
      }
    }

    if (result) return result

    for (var i = 0; i < grounds.length; i++) {
      let ground = grounds[i]
      if (ground && ground.getRoom() === room) {
        result = ground
        break
      }
    }

    return result
  }

  isGroundTile() {
    return false
  }

  onNPCClientMessage(data) {

  }

  isSkyTile() {
    return false
  }

  isPlatformDirtiable() {
    return !this.hasCategory("soil") &&
      !this.hasBuildingOnTop() &&
      this.getType() !== Protocol.definition().BuildingType.Lattice &&
      this.getType() !== Protocol.definition().BuildingType.RailTrack
  }

  getStandingPlatform() {
    return this.getContainer().getStandingPlatform(this.getRow(), this.getCol())
  }

  isOnRailTram() {
    return this.getContainer() && this.getContainer().hasCategory("rail_tram")
  }

  getImmunity() {
    return this.getConstants().immunity || []
  }

  isImmuneTo(category) {
    let immunityList = this.getImmunity()
    return immunityList.indexOf(category) !== -1
  }

  consumeWeb() {
    const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isTwoSecondInterval) return

    const webDuration = 2 * Constants.physicsTimeStep

    if (this.hasEffect("web")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("web")
      if (accumulatedTime >= webDuration) {
        this.removeEffect("web")
      }
    }
  }

  consumeParalyze() {
    const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isTwoSecondInterval) return

    const paralyzeDuration = 5 * Constants.physicsTimeStep

    if (this.hasEffect("paralyze")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("paralyze")
      if (accumulatedTime >= paralyzeDuration) {
        this.removeEffect("paralyze")
      }
    }
  }

  consumePoison() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 3) === 0
    if (!isThreeSecondInterval) return

    if (this.isImmuneTo("poison")) return

    const poisonDuration = 20 * Constants.physicsTimeStep

    if (this.hasEffect("poison")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("poison")
      if (accumulatedTime >= poisonDuration) {
        this.removeEffect("poison")
      } else {
        this.setHealth(this.health - 10)
      }
    }

  }

  consumeFear() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isThreeSecondInterval) return

    const fearDuration = 15 * Constants.physicsTimeStep

    if (this.hasEffect("fear")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("fear")
      if (accumulatedTime >= fearDuration) {
        this.removeEffect("fear")
      }
    }
  }

  isReachableFromRoom() {
    return false
  }

  detectMiasma() {
    if (this.hasEffect("miasma")) return
    let boundingBox = this.getNeighborBoundingBox(Constants.tileSize)

    if (!this.container.isSector()) return
    if (this.isImmuneTo("miasma")) return
    if (!this.shouldSpreadMiasma()) return

    // corpses
    let hits = this.container.unitMap.hitTestTileCollection(this.getPaddedRelativeBox())

    let hasMiasma = hits.find((hit) => {
      return hit.entity && hit.entity.hasEffect("miasma")
    })

    if (!hasMiasma) {
      // detect from players, mobs, crops
      let players = this.container.playerTree.search(boundingBox)
      let mobs = this.container.mobTree.search(boundingBox)
      let crops = this.container.buildingTree.search(boundingBox).filter((entity) => {
        return entity.isCrop()
      })

      hasMiasma = [players, mobs, crops].flat()
        .find((entity) => {
          return entity.hasEffect("miasma")
        })
    }

    if (hasMiasma) {
      this.addMiasma()
    }
  }

  shouldSpreadMiasma() {
    return !this.game.isMiniGame()
  }

  spreadMiasma() {
    if (!this.hasEffect("miasma")) return
    if (!this.container.isSector()) return
    if (this.isImmuneTo("miasma")) return
    if (!this.shouldSpreadMiasma()) return

    let boundingBox = this.getNeighborBoundingBox(Constants.tileSize)

    // spread to players, mobs, crops
    let players = this.container.playerTree.search(boundingBox)
    let mobs = this.container.mobTree.search(boundingBox)
    let crops = this.container.buildingTree.search(boundingBox).filter((entity) => {
      return entity.isCrop()
    })

    if (Math.random() <= 0.5) {
      players.forEach((entity) => {
        if (!entity.isImmuneTo("miasma")) {
          entity.addMiasma()
        }
      })

      mobs.forEach((entity) => {
        if (!entity.isImmuneTo("miasma")) {
          entity.addMiasma()
        }
      })

      crops.forEach((entity) => {
        if (!entity.isImmuneTo("miasma")) {
          entity.addMiasma()
        }
      })
    }
  }

  consumeMiasma() {
    if (this.isImmuneTo("miasma")) return

    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0
    if (!isFiveSecondInterval) return

    let effectName = "miasma"

    if (!this.hasEffect(effectName)) return

    const miasmaDuration = 60 * Constants.physicsTimeStep

    this.reduceHealth(this.getMiasmaDamage())

    const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt(effectName)
    if (accumulatedTime >= miasmaDuration) {
      this.removeEffect(effectName)
    }
  }

  consumeSpin() {
    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0
    if (!isFiveSecondInterval) return
    let effectName = "spin"
    if (!this.hasEffect(effectName)) return

    const spinDuration = 4 * Constants.physicsTimeStep
    const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt(effectName)
    if (accumulatedTime >= spinDuration) {
      this.removeEffect(effectName)
    }
  }

  getMiasmaDamage() {
    return 1
  }

  consumeDrunk() {
    const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isTwoSecondInterval) return

    const drunkDuration = 60 * Constants.physicsTimeStep

    if (this.hasEffect("drunk")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("drunk")
      if (accumulatedTime >= drunkDuration) {
        this.removeEffect("drunk")
      }
    }
  }

  consumeInvisible() {
    const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isTwoSecondInterval) return

    const duration = 30 * Constants.physicsTimeStep

    if (this.hasEffect("invisible")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("invisible")
      if (accumulatedTime >= duration) {
        this.removeEffect("invisible")
      }
    }
  }

  consumeHaste() {
    const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
    if (!isTwoSecondInterval) return

    const duration = 15 * Constants.physicsTimeStep

    if (this.hasEffect("haste")) {
      const accumulatedTime = this.game.timestamp - this.getEffectCreatedAt("haste")
      if (accumulatedTime >= duration) {
        this.removeEffect("haste")
      }
    }
  }

  consumeAndProduceDirt() {
    if (!this.sector.shouldFloorsAutodirt()) return

    // only producer dirt when creator is online
    let creatorTeam = this.game.getCreatorTeam()
    if (creatorTeam && !creatorTeam.hasAdminOnline()) return

    let platform = this.getStandingPlatform()
    if (!platform) return

    this.lastDirtTimestamp = this.lastDirtTimestamp || this.game.timestamp
    let canMakeDirt = (this.game.timestamp - this.lastDirtTimestamp) > (Constants.physicsTimeStep * 60 * 2) // every 2 minutes
    if (!canMakeDirt) return

    let isAsteroidGround = platform.isTerrain() && platform.isGroundTile()
    if (isAsteroidGround || platform.hasCategory('soil')) {
      this.accumulateDirt()
    } else if (platform.hasCategory('platform') && platform.isPlatformDirtiable()) {
      let dirtChance = Math.random() < 0.35
      if (this.getAccumulateDirt() > 0 && dirtChance) {
        this.decrementDirt()
        platform.addDirt()
      } else if (this.getAccumulateDirt() <= 0) {
        this.lastDirtTimestamp = this.game.timestamp
      }
    }
  }

  accumulateDirt() {
    this.dirt = 8
  }

  decrementDirt() {
    this.dirt -= 1
  }

  getAccumulateDirt() {
    return this.dirt
  }

  consumeFire() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    let platform = this.getStandingPlatform()

    if (platform && platform.isOnFire()) {
      if (platform.isLava()) {
        this.reduceHealth(24)
      } else {
        this.reduceHealth(15)
        this.addFire(3)
      }
    } else {
      if (this.isOnFire()) {
        this.fireDuration = this.fireDuration ? this.fireDuration : 0
        this.fireDuration += 1

        if (this.fireDuration >= 3) {
          this.removeFire()
          this.fireDuration = 0
        }
      }

    }

  }

  isLava() {
    return false
  }

  enableCustomVelocity() {
    this.isCustomVelocity = true
  }

  disableCustomVelocity() {
    this.isCustomVelocity = false
  }

  getMaxSpeedFromForce() {
    if (this.isCustomVelocity) return 100

    return this.getSpeed()
  }

  reduceFireSlowly() {
    this.fireReductionCounter = this.fireReductionCounter || 0
    this.fireReductionCounter += 1

    if (this.fireReductionCounter >= this.FIRE_MANUAL_REDUCTION_RATE) {
      this.reduceFire()
      this.fireReductionCounter = 0
    }
  }

  growFire() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    this.applyFireDamage()

    const isTimeToGrow = this.game.timestamp % (Constants.physicsTimeStep * this.FIRE_GROW_RATE) === 0
    if (!isTimeToGrow) return

    this.addFire()

    if (this.canSpreadFire()) {
      if (this.isMaxEffectLevelReached("fire")) {
        this.spreadFire()
      }
    }
  }

  getKillerFromAttacker(attacker) {
    if (attacker.isMob()) return attacker
    if (attacker.isPlayer()) return attacker
    if (typeof attacker.isProjectile !== 'function') return null

    if (attacker.isProjectile()) {
      if (attacker.weapon) {
        if (attacker.weapon.isBuilding()) {
          return attacker.weapon.placer
        } else {
          // weapon equipment
          return attacker.owner
        }
      }
    }
  }

  getDamage() {
    return this.getStats(this.level).damage
  }

  setLevel(level) {
    this.level = level
  }

  applyFireDamage() {
    this.setHealth(this.health - 1)
  }

  canSpreadFire() {
    return false
  }

  spreadFire() {
    const hits = this.getSideTiles(this.container.platformMap)
    hits.forEach((hit) => {
      if (hit.entity && hit.entity.isFlamable() && !hit.entity.isOnFire()) {
        hit.entity.addFire()
      }
    })
  }

  static getSideTiles(tilemap, relativeBox) {
    const paddedRelativeBox = this.getPaddedRelativeBox(relativeBox)
    let coreHits = tilemap.hitTestTile(relativeBox)
    let paddedHits = tilemap.hitTestTile(paddedRelativeBox)
    const coreEdges = tilemap.getDiagonalEdges(paddedRelativeBox)

    return paddedHits.filter((hit) => {
      const isPartOfCoreOrDiagonal = coreHits.find((coreHit) => {
        return this.isSameHit(coreHit, hit) ||
          this.isSameHit(coreEdges.upperLeft, hit) ||
          this.isSameHit(coreEdges.upperRight, hit) ||
          this.isSameHit(coreEdges.lowerLeft, hit) ||
          this.isSameHit(coreEdges.lowerRight, hit)
      })
      return !isPartOfCoreOrDiagonal
    })
  }

  getSideTiles(tilemap) {
    let relativeBox = this.getRelativeBox()
    return this.constructor.getSideTiles(tilemap, relativeBox)
  }


  static getPaddedRelativeBox(box) {
    return {
      pos: {
        x: box.pos.x - Constants.tileSize,
        y: box.pos.y - Constants.tileSize
      },
      w: box.w + Constants.tileSize * 2,
      h: box.h + Constants.tileSize * 2
    }
  }

  static isSameHit(hit, otherHit) {
    return hit.row === otherHit.row && hit.col === otherHit.col
  }

  static getBox(x, y, w, h) {
    return this.prototype.getBox(x, y, w, h)
  }

  removeCustomStats() {
    if (this.sector.entityCustomStats[this.id]) {
      delete this.sector.entityCustomStats[this.id]
    }
  }

  remove() {
    super.remove()

    this.isRemoved = true

    this.removeFlowField()
    this.removeAllEffects()
    this.removeCustomStats()

    if (this.hasPhysics()) {
      this.world.removeBody(this.body)
    }

    if (this.shouldEmitEntityRemoved()) {
      EventBus.dispatch(this.game.getId() + ":entity:removed", this)
      EventBus.dispatch(this.game.getId() + ":entity:removed:" + this.getId(), this)
    }

    this.removeListeners()
  }

  shouldEmitEntityRemoved() {
    return true
  }

  addMoveListener(listener) {
    this.onMoveListeners.push(listener)
  }

  isDraggable() {
    return false
  }

  setHealth() {
    // does nothing by default
  }

  setStorage(storage, index) {
    this.storage = storage
    this.storageIndex = index
  }

  emitMoveListeners() {
    this.onMoveListeners.forEach((listener) => {
      listener(this)
    })
  }

  isClaimed() {
    return this.sector.hasClaim(this)
  }

  removeListeners() {
    this.onMoveListeners = []
  }

  removeListener(listener) {
    const index = this.onMoveListeners.indexOf(listener)
    if (index !== -1) {
      this.onMoveListeners.splice(index, 1)
    }
  }

  getObstacleCollisionWidth() {
    return this.getConstants().obstacleCollisionWidth || this.getWidth()
  }

  getObstacleCollisionHeight() {
    return this.getConstants().obstacleCollisionHeight || this.getHeight()
  }

  triggerTraps() {
    let relativeBox = this.getRelativeBox()
    const entity = this.getSector().platformMap.get(this.getRow(), this.getCol())

    if (entity && entity.isTrap()) {
      entity.trigger()
    }
  }

  onActionReleased() {

  }

  getRotatedWidth() {
    return this.getWidth()
  }

  getRotatedHeight() {
    return this.getHeight()
  }

  getWidth() {
    return this.w || this.getConstants().width
  }

  getHeight() {
    return this.h || this.getConstants().height
  }

  onStateChanged(attribute) {
    if (attribute) {
      this.changedAttributes[attribute] = true
    }
  }

  getChangedAttributesList() {
    return Object.keys(this.changedAttributes)
  }

  clearChangedAttributes() {
    this.changedAttributes = {}
  }

  getCollisionMask() {
    throw new Error("Must implement " + this.constructor.name + "#getCollisionMask")
  }

  getCollisionGroup() {
    throw new Error("Must implement " + this.constructor.name + "#getCollisionGroup")
  }

  getBodyProperties(x, y) {
    return {
      mass: 0,
      position: [x, y]
    }
  }

  shouldCheckForPvpSettings(targetEntity) {
    if (!targetEntity.isPlayer()) return false
    if (this.isProjectile()) {
      if (!this.getPlayer()) return false
    }

    return true
  }


  isFriendlyUnit(targetEntity) {
    if (!targetEntity.getAlliance()) return true // unowned things are friendly

    if (this.shouldCheckForPvpSettings(targetEntity)) {
      if (targetEntity.getRegion() && targetEntity.getRegion().getFlag("pvp")) {
        let pvpFlag = targetEntity.getRegion().getFlag("pvp")
        return pvpFlag === 'deny'
      }

      if (this.game.sector.getSetting("isPvPAllowed")) {
        return false
      }
    }

    return this.getAlliance() === targetEntity.getAlliance()
  }

  getRegion() {
    let padding = 1
    let x = this.getX()
    let y = this.getY()
    let w = this.getWidth()
    let h = this.getHeight()

    let boundingBox = {
      minX: x - w / 2 + padding,
      minY: y - h / 2 + padding,
      maxX: x + w / 2 - padding,
      maxY: y + w / 2 - padding
    }

    let regions = this.sector.regionTree.search(boundingBox)
    if (regions.length === 0) return null

    return regions[0]
  }

  getEntityGroup() {
    return "buildings" // need to change for each entity group..
  }

  getShape() {
    return new p2.Circle({ radius: this.getWidth() / 2 })
  }

  getCircle() {
    return { x: this.getX(), y: this.getY(), radius: this.getWidth() / 2 }
  }

}


Object.assign(BaseEntity.prototype, BoundingBox.prototype, {
  getX() {
    return this.x
  },
  getY() {
    return this.y
  }
})

Object.assign(BaseEntity.prototype, Taintable.prototype, {
  onEffectAdded(effect) {
    if (effect === "fire") {
      this.getContainer().addFlame(this)
    }

    if (effect === "paralyze" || effect === "web") {
      this.stopMoving()
      this.setDormant(true)
    }
  },
  onEffectRemoved(effect) {
    if (effect === "fire") {
      this.getContainer().removeFlame(this)
    }

    if (effect === "paralyze" || effect === "web") {
      this.setDormant(false)
    }

    this.onStateChanged("effects")
  },
  onEffectLevelChanged(effect, level) {
    this.onStateChanged("effects")
  }
})

module.exports = BaseEntity
