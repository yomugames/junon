const BaseEntity = require("./../base_entity")
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const Movable = require('../../../common/interfaces/movable')

class RailTram extends BaseEntity {
  constructor(sector, data, options) {
    super(sector, data)

    this.applyData(data)
    this.initFlowField()
    
    this.flames = {}

    this.sector.addTransport(this)

    this.shouldFindNextJunction = true

    this.onPositionChanged()
  }

  raycast() {
    return null
  }

  addFlame(entity) {
    this.flames[entity.id] = entity
  }

  removeFlame(entity) {
    delete this.flames[entity.id]
  }

  initFlowField() {
    let railNetwork = this.getRailNetwork()    
    if (!railNetwork) return

    if (!this.destination) return

    let flowField = railNetwork.getFlowField(this.destination)  
    if (!flowField) {
      railNetwork.requestFlowField(this.destination, {})
    }
  }
  

  getCollisionGroup() {
    return Constants.collisionGroup.Building
  }

  getCollisionMask() {
    return Constants.collisionGroup.Player
  }

  setSource(entity) {
    this.source = entity
  }

  setDestination(entity) {
    this.destination = entity
  }

  applyData(data) {
    this.type = this.getType()
    this.dormantCounter = 0

    this.passengers = {}

    if (data.source) {
      let entity = this.game.getEntity(data.source.id)
      if (entity) {
        this.setSource(entity)
      }
    }

    if (data.destination) {
      let entity = this.game.getEntity(data.destination.id)
      if (entity) {
        this.setDestination(entity)
      }
    }

    for (let passengerId in data.passengers) {
      let passengerRef = data.passengers[passengerId]
      let entity = this.game.getEntity(passengerRef.id)
      if (entity) {
        this.addPassenger(entity)
      }
    }

  }

  unmountPassengers() {
    for (let id in this.passengers) {
      let passenger = this.passengers[id]
      this.removePassenger(passenger)
    }
  }

  removePassenger(entity) {
    delete this.passengers[entity.getId()] 
    entity.setDormant(false)
    entity.setContainer(this.sector)
    entity.setRelativePosition(0,0)
  }

  getStandingPlatformFromBounds(boundingBox) {
    return this.sector.getStandingPlatformFromBounds(boundingBox)
  }

  addPassenger(entity) {
    if (entity.isPlayerData()) return

    this.passengers[entity.getId()] = entity
    entity.setDormant(true)

    // get relative position before contianer is set
    let position = this.getRelativePositionFor(entity)
    entity.setContainer(this)
    entity.setRelativePosition(position.x, position.y)
  }

  getRelativePositionFor(entity) {
    let topLeft = this.getGridRulerTopLeft()
    return {
      x: entity.getX() - topLeft.x,
      y: entity.getY() - topLeft.y
    }
  }

  getGridRulerTopLeft() {
    return {
      x: this.getX() - Constants.tileSize * 1.5,
      y: this.getY() - Constants.tileSize * 1.5
    }
  }

  getType() {
    return Protocol.definition().TransportType.RailTram
  }

  getConstantsTable() {
    return "Transports.RailTram"
  }

  hasPhysics() {
    return true
  }

  move(deltaTime) {
    this.moveEntity()
  }

  willExceedNextPoint(nextJunction, direction) {
    if (!nextJunction) return false

    let angle = Math.atan2(direction[1], direction[0])

    let velocityX = this.getSpeed() * Math.cos(angle)
    let velocityY = this.getSpeed() * Math.sin(angle)
    let futureX = this.body.position[0] + velocityX
    let futureY = this.body.position[1] + velocityY

    if (direction[0] === 1 && direction[1] === 0) {
      // right
      return futureX >= nextJunction.getX()
    } else if (direction[0] === 0 && direction[1] === 1) {
      // down
      return futureY >= nextJunction.getY()
    } else if (direction[0] === -1 && direction[1] === 0) {
      // left
      return futureX <= nextJunction.getX()
    } else if (direction[0] === 0 && direction[1] === -1) {
      // up
      return futureY <= nextJunction.getY()
    }
  }

  handleMovementInRailTracks(rail, speed) {
    let angle = 0
    let railNetwork = rail.getRailNetwork()
    if (!railNetwork) return
      
    if (!this.destination) return

    let flowField = railNetwork.getFlowField(this.destination)
    if (!flowField) return

    if (this.skipTurn) {
      this.skipTurn = false
      return
    }

    if (this.shouldFindNextJunction) {
      this.direction = flowField.getDirection(rail.getRow(), rail.getCol())
      this.nextJunction = rail.getNextJunction(this.direction)
                         
      this.shouldFindNextJunction = false
    }

    if (this.nextJunction && 
        this.willExceedNextPoint(this.nextJunction, this.direction) &&
        !this.isNextJunctionGoingToRailStop()) {
      this.setPosition(this.nextJunction.getX(), this.nextJunction.getY())
      this.stopMoving()

      this.shouldFindNextJunction = true
      this.skipTurn = true

      return
    } 

    angle = Math.atan2(this.direction[1], this.direction[0])

    this.body.velocity[0] = speed * Math.cos(angle)
    this.body.velocity[1] = speed * Math.sin(angle)
  }

  isNextJunctionGoingToRailStop() {
    let junctionRow = this.nextJunction.getRow()
    let junctionCol = this.nextJunction.getCol()
    let nextStructureHit = this.getContainer().structureMap.get(junctionRow + this.direction[1], junctionCol + this.direction[0])
    return nextStructureHit && nextStructureHit.hasCategory("rail_stop")
  }

  handleMovementInRailStop(structure, speed) {
    let angle = 0

    if (structure === this.destination) {
      // go to middle (maintain last direction)
      speed = 5
      let railStopTramCenter = structure.getTramCenter()
      let distanceToStop = this.game.distance(this.getX(), this.getY(), railStopTramCenter.x, railStopTramCenter.y)
      if (distanceToStop < 8) {
        this.setPosition(structure.getX(), structure.getY())
        this.stopMoving()
        this.onDestinationArrived()
        this.remove()
        return
      }

      angle = Math.atan2(this.direction[1], this.direction[0])
    } else {
      if (this.hasVisited(structure)) {
        // go to tracks
        let track = structure.getTrackTowards(this.destination)

        // sometimes no track. // temp fix for https://sentry.io/organizations/junon/issues/1713853824/?project=1467963
        if (track) {
          angle = this.game.angle(this.getX(), this.getY(), track.getX(), track.getY())
          this.direction = [Math.cos(angle), Math.sin(angle)]
        } else {
          this.direction = [1,0]
        }

        this.shouldFindNextJunction = true
      } else {
        let center = structure.getTramCenter()
        this.setPosition(center.x, center.y)
        this.stopMoving()

        this.setVisited(structure)
        return
      }
    }

    this.body.velocity[0] = speed * Math.cos(angle)
    this.body.velocity[1] = speed * Math.sin(angle)
  }

  hasVisited(structure) {
    this.visitedStops = this.visitedStops || {}
    return this.visitedStops[structure.getId()]
  }

  setVisited(structure) {
    this.visitedStops = this.visitedStops || {}
    this.visitedStops[structure.getId()] = true
  }

  onDestinationArrived() {
    for (let id in this.passengers) {
      let entity = this.passengers[id]
      if (entity.isPlayer()) {
        entity.walkthroughManager && entity.walkthroughManager.handle("rail_tram")
      }
    }
  }

  moveEntity() {
    let speed = this.getSpeed()

    this.handleMovementStuck()

    // rail track movement
    let rail = this.getContainer().railMap.get(this.getRow(), this.getCol())
    if (rail) {
      this.handleMovementInRailTracks(rail, speed)
    }

    // rail stop movement
    let structure = this.getContainer().structureMap.get(this.getRow(), this.getCol())
    if (structure && structure.hasCategory("rail_stop")) {
      this.handleMovementInRailStop(structure, speed)
    }
      
  }

  limitVerticalMovement() {

  }

  limitHorizontalMovement() {

  }

  handleMovementStuck() {
    let x = this.getX()
    let y = this.getY()

    let isSamePosition = x === this.lastX && y === this.lastY
    if (isSamePosition) {
      this.dormantCounter += 1
      if (this.dormantCounter > (Constants.physicsTimeStep * 5)) {
        this.onTransportStuck()
      }
    } else {
      this.dormantCounter = 0
    }

    this.lastX = this.getX()
    this.lastY = this.getY()
  }

  onTransportStuck() {
    // teleport passengers back to source

    if (this.source) {
      for (let id in this.passengers) {
        let passenger = this.passengers[id]
        passenger.setPosition(this.source.getX(), this.source.getY())
      }
    }

    this.remove()
  }

  getRailNetwork() {
    let rail = this.getContainer().railMap.get(this.getRow(), this.getCol())
    if (rail) return rail.getRailNetwork()

    let structure = this.getContainer().structureMap.get(this.getRow(), this.getCol())
    if (structure) return structure.getRailNetwork()

    return null
  }

  remove() {
    this.unmountPassengers()

    this.unregister()

    this.clientMustDelete = true

    super.remove()

    this.onStateChanged()
  }

  unregister() {
    this.sector.removeTransport(this)
  }

  setPositionFromVelocity() {
    const prev = { x: this.getX(), y: this.getY() }

    super.setPositionFromVelocity()

    const curr = { x: this.getX(), y: this.getY() }

    for (let passengerId in this.passengers) {
      let passenger = this.passengers[passengerId]
      this.setPositionFromParentAndEmitListeners(passenger)
    }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()
    }
  }

  setPositionFromParentAndEmitListeners(entity) {
    entity.setPositionFromParent()

    const isVelocityPresent = this.body.velocity[0] !== 0 || this.body.velocity[1] !== 0
    if (isVelocityPresent) {
      entity.emitMoveListeners()
    }
  }

  onPositionChanged() {
    this.onStateChanged()
  }

  onStateChanged() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.addChangedTransports(this)
    }
  }

  getRowCount() {
    return 3
  }

  getColCount() {
    return 3
  }
}

Object.assign(RailTram.prototype, Movable.prototype, {
  getSpeed() {
    return 48
  }
})

module.exports = RailTram
