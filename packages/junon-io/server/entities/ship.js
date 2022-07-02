const BaseEntity = require("./base_entity")
const Buildings = require("./buildings/index")
const Shield = require("./shield")
const Grid = require('../../common/entities/grid')
const FloodFillManager = require("./../../common/entities/flood_fill_manager")
const FloodFillQueue = require("./../../common/entities/flood_fill_queue")
const Protocol = require('../../common/util/protocol')
const p2 = require('p2')
const Constants = require('../../common/constants.json')
const Movable = require('../../common/interfaces/movable')
const Destroyable = require('../../common/interfaces/destroyable')
const Container = require('../../common/interfaces/container')
const RoomManager = require("./networks/room_manager")
const PressureManager = require("./networks/pressure_manager")
const PowerManager = require("./networks/power_manager")
const OxygenManager = require("./networks/oxygen_manager")
const PathFinder = require("./../ai/path_finder")
const SAT = require("sat")
const HomeArea = require("./home_area")
const Pickup = require("./pickup")

class Ship extends BaseEntity {
  constructor(sector, data, options) {
    super(sector, data)

    this.crews = {}
    this.mobs = {}

    this.blueprint = options.blueprint

    this.angle = 0
    this.level = 0
    this.turnSpeed = 5
    this.owner = options.pilot
    this.hangar = null

    this.initDestroyable()
    this.initMovable()

    this.initComponents()

    this.initGrids()
    this.occupancies = new Grid("occupancies", this, this.getRowCount(), this.getColCount())

    this.floodFillQueue = new FloodFillQueue()

    this.platformMap.setBoundaryDetector(this.isPlatformBoundary)

    this.homeArea = new HomeArea(this)

    this.initPressureManager()
    this.initOxygenManager()
    this.initRoomManager()
    this.initPowerManager()

    this.applyBlueprint(this.blueprint)

    this.setHealth(this.getMaxHealth())

    if (options.pilot) {
      this.addCrew(options.pilot)
      this.setPilot(options.pilot)
    }

    this.onShipConstructed()
  }

  createPickup(data) {
    return new Pickup(this, data)
  }

  dockInPlace() {
    let topLeft = {
      x: this.getX() - this.getWidth()/2,
      y: this.getY() - this.getHeight()/2,
    }

    this.unregister()
    this.blueprint.applyTo(this.sector, topLeft, this.owner)
    this.mobilizeCrew()
  }

  getStandingPlatform(row, col) {
    let entity = this.platformMap.get(row, col)
    if (entity) return entity

    return null
  }

  setTurnSpeed(turnSpeed) {
    this.turnSpeed = turnSpeed
  }

  getTurnSpeed() {
    return this.turnSpeed
  }

  undockInPlace() {
    this.sector.removeBuildings(this.getBox())
    this.register()

    this.dockingDoor.onSealerStateChanged()
  }

  onShipConstructed() {
    this.setShipSector(this.sector)
  }

  addCrewAt(entity, x, y) {
    this.addCrew(entity)
    entity.setRelativePosition(x, y)
  }

  setOccupancy(row, col, entity) {
    this.occupancies.set({row: row, col: col, value: entity })
  }

  getOccupancy(row, col) {
    return this.occupancies.get(row, col)
  }

  addCrew(entity) {
    entity.ship = this
    this.crews[entity.id] = entity
    this.setOccupancy(entity.getRow(), entity.getCol(), entity)
  }

  setOwner(owner) {
    this.owner = owner

    const buildings = [this.platforms, this.armors, this.distributions, this.crops, this.structures, this.units]
    buildings.forEach((group) => {
      for (let entityId in group) {
        let entity = group[entityId]
        entity.setOwner(owner)
      }
    })
  }

  addShape() {
    // no shape in beginning. at shape as we add block
  }

  removeCrew(entity) {
    entity.ship = null
    delete this.crews[entity.id]
    this.setOccupancy(entity.getRow(), entity.getCol(), null)
  }

  addMob(entity) {
    this.mobs[entity.id] = entity
  }

  removeMob(entity) {
    delete this.mobs[entity.id]
  }

  getNextEmptyPlatform() {
    this.lastPlatformIndex = this.lastPlatformIndex || 0
    const platformList = Object.values(this.platforms)

    let occupied = true
    let platform = null

    while(occupied) {
      platform = platformList[this.lastPlatformIndex]
      this.lastPlatformIndex += 1

      // no platform, index of out bounds
      if (!platform) {
        break
      }

      // found one
      if (platform && !this.isOccupied(platform)) {
        break
      }
    }

    return platform
  }

  isOccupied(platform) {
    let isStructureOccupied = platform.isOccupied()
    return isStructureOccupied || this.getOccupancy(platform.getRow(), platform.getCol())
  }

  getRandomUnoccupiedPlatform() {
    let occupied = true
    let keys = Object.keys(this.platforms)
    let platform

    while (occupied) {
      let randomIndex = Math.floor(Math.random() * keys.length)
      platform = this.platforms[keys[randomIndex]]
      if (!this.isOccupied(platform)) {
        occupied = false
      }
    }

    return platform
  }

  getCaptain() {
    return this.pilot || this.owner
  }

  move(deltaTime) {
    if (this.shouldLeaveSector) {
      this.setVelocityBasedOnAngle()
      return
    }

    if (this.pilot) {
      this.pilot.moveEntity(this, deltaTime)
    }
  }

  leaveSector() {
    this.shouldLeaveSector = true
  }

  getCollidables() {
    let buildings = this.sector.buildingTree.search(this.getBoundingBox())
    let collidableBuildings = buildings.filter((building) => {
      return !building.hasCategory("platform") && !building.hasCategory("distribution")
    })

    return collidableBuildings
  }

  hasPhysics() {
    return true
  }

  limitVerticalMovement() {
    const collidables = this.getCollidables()
    let colliderMargin = this.body.velocity[1] > 0 ? -10 : 10 // opposite direction of ship

    for (var i = 0; i < collidables.length; i++) {
      let entity = collidables[i]
      let radius = entity.getWidth()/2
      let box = new SAT.Box(new SAT.Vector(entity.getX(), entity.getY() + colliderMargin), entity.getWidth(), entity.getHeight())

      let isColliding = SAT.testPolygonPolygon(this.polygon, box.toPolygon())
      if (isColliding) {
        this.resetVerticalVelocity(this.body)
        break
      }
    }
  }

  hasAngularCollision() {
    const isColliding = false
    const collidables = this.getCollidables()

    for (var i = 0; i < collidables.length; i++) {
      let entity = collidables[i]
      let radius = entity.getWidth()/2
      let box = new SAT.Box(new SAT.Vector(entity.getX(), entity.getY()), entity.getWidth(), entity.getHeight())

      isColliding = SAT.testPolygonPolygon(this.polygon, box.toPolygon())
      if (isColliding) {
        break
      }
    }

    return isColliding
  }

  limitHorizontalMovement() {
    const collidables = this.getCollidables()
    let colliderMargin = this.body.velocity[0] > 0 ? -10 : 10 // opposite direction of ship

    for (var i = 0; i < collidables.length; i++) {
      let entity = collidables[i]
      let radius = entity.getWidth()/2
      let circle = new SAT.Circle(new SAT.Vector(entity.getX() + colliderMargin, entity.getY()), radius)

      let isColliding = SAT.testPolygonCircle(this.polygon, circle)
      if (isColliding) {
        this.resetHorizontalVelocity(this.body)
        break
      }
    }
  }

  dampenVelocity() {
    super.dampenVelocity()

    if (this.pilot) {
      this.pilot.dampenVelocity()
    }
  }

  setPosition(x, y) {
    const prev = { x: this.getX(), y: this.getY() }
    super.setPosition(x, y)
    const curr = { x: this.getX(), y: this.getY() }

    if (this.pilot) {
      this.pilot.setPosition(x, y) // needs fixing, needs to maintain relative position w/ ship
    }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()
    }
  }

  onAngleChanged() {
    if (this.polygon) {
      this.polygon.setAngle(this.getRadAngle())
    }
  }

  onPositionChanged() {
    if (this.sector) {
      this.unregister()
      this.register() // register new location on shipTree
      this.manageDocking()
      this.recreatePolygon()
      this.goToWorldMap()
    }
  }

  goToWorldMap() {
    const isOffScreen = this.getX() < 0 || this.getY() < 0
    if (isOffScreen) {
      this.stopMoving()
      if (this.pilot && this.pilot.isPlayer()) {
        this.handlePlayerShipOffScreen()
      } else {
        this.handleRegularShipOffScreen()
      }
    }
  }

  handleRegularShipOffScreen() {
    this.remove()
  }

  handlePlayerShipOffScreen() {
    this.pilot.isOnStarMap = true
    this.pilot.controlKeys = 0
    this.pilot.setSector(null)
    this.getSocketUtil().emit(this.pilot.getSocket(), "ShowStarMap", { })
  }


  manageDocking() {
    this.updateRbushCoords()
    let regions = this.sector.regionTree.search(this.getBoundingBox())
    let region = regions[0]

    if (region && region.isHangar() && (region.hasShip(this) || region.isNotOccupied()) ) {
      this.setHangar(region)
    } else {
      this.setHangar(null)
    }
  }

  setHangar(hangar) {
    const prevHangar = this.hangar
    if (this.hangar !== hangar) {
      this.hangar = hangar
      this.onHangarChanged(prevHangar)
    }
  }

  onHangarChanged(prevHangar) {
    if (this.hangar) {
      this.hangar.dock(this)
    } else {
      prevHangar.undock(this)
    }
  }

  validateAngleValid(angle) {

  }

  setAngle(angle) {
    const prev = this.angle

    super.setAngle(angle)
    const curr = this.angle

    const pilotSeatingAngle = -90
    this.setPilotAngle(angle + pilotSeatingAngle)

    if (prev !== curr) {
      this.onAngleChanged()
    }
  }

  setPilotAngle(angle) {
    if (this.pilot) {
      this.pilot.setAngle(angle)
    }
  }

  // when ship is at 0 deg, its facing direction is upwards, and should move upwards
  getDirectionRadianModifier() {
    return -90 * Math.PI / 180
  }

  getGridRulerTopLeft() {
    const gridSize = this.getRowCount() * Constants.tileSize

    const gridTopLeft  = {
      x: this.getX() - gridSize / 2,
      y: this.getY() - gridSize / 2
    }

    return gridTopLeft
  }

  exportBlueprint() {
    this.blueprint.export("./../../ship.json")
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Ship
  }

  getWidth() {
    return 32 // placeholder
  }

  getHeight() {
    return 32 // placeholder
  }

  getCollisionMask() {
    return Constants.collisionGroup.Player
  }


  increaseLevel() {
    this.level += 1
  }

  createNewShield() {
    this.shield = new Shield(this.sector, this, this.owner)
  }

  removeShield(shield) {
    this.shield = null
    shield.remove()
  }

  setWave(wave) {
    this.wave = wave
  }

  remove() {
    this.isMarkedForRemoval = true

    if (this.wave) {
      this.wave.removeShip(this)
    }

    this.removeAllBuildings()
    this.unregister()

    super.remove()
  }

  unregister() {
    delete this.sector.ships[this.id]
    this.sector.removeEntityFromTreeByName(this, "ships")
  }

  storeMinerals(minerals) {
    let success = false

    for (let mineralStorageId in this.mineralStorages) {
      let mineralStorage = this.mineralStorages[mineralStorageId]
      if (mineralStorage.hasEnoughMineralStorage()) {
        let unstored = mineralStorage.store(minerals)
        minerals = unstored
        success = true

        if (unstored === 0) break
      }
    }

    return success
  }

  initComponents() {
    this.shipCore = null

    this.mineralStorages = {}
    this.dockingBays = {}

  }

  setDockingDoor(door) {
    this.dockingDoor = door
  }

  isPlatformBoundary(entity) {
    return !entity // if its not platform, its considered a boundary
  }

  applyBlueprint() {
    this.blueprint.applyTo(this)

    this.w = this.getColCount() * Constants.tileSize
    this.h = this.getRowCount() * Constants.tileSize

    this.recreatePolygon()
  }

  placeBuilding(data) {
    data.owner = this.owner

    if (typeof data.type === "string") {
      data.type = Buildings[data.type].getType()
    }

    Buildings.forType(data.type).build(data, this)
  }

  reconstruct() {
    this.applyBlueprint()
    this.setHealth(this.getMaxHealth())
  }

  executeTurn() {
    for (let buildingId in this.flames) {
      let building = this.flames[buildingId]
      building.growFire()
    }

    for (let buildingId in this.dockingBays) {
      let building = this.dockingBays[buildingId]
      building.executeTurn()
    }

    for (let buildingId in this.towers) {
      let building = this.towers[buildingId]
      building.executeTurn()
    }

    for (let unitId in this.units) {
      let building = this.units[unitId]
      building.executeTurn()
    }

    for (let cropId in this.crops) {
      let crop = this.crops[cropId]
      crop.executeTurn()
    }

    for (let id in this.breakings) {
      let breaking = this.breakings[id]
      breaking.reduceBreak()
    }


    this.roomManager.processPartitionRequestQueue()
    this.roomManager.executeTurn()
  }

  setPositionFromParentAndEmitListeners(entity) {
    entity.setPositionFromParent()

    const isVelocityPresent = this.body.velocity[0] !== 0 || this.body.velocity[1] !== 0
    if (isVelocityPresent) {
      entity.emitMoveListeners()
    }
  }

  initPressureManager() {
    this.pressureManager = new PressureManager(this)
  }

  initOxygenManager() {
    this.oxygenManager = new OxygenManager(this)
    this.oxygenManager.setGrids([this.gasDistributionMap])
    this.oxygenManager.setStructureGrid(this.structureMap)
  }

  initRoomManager() {
    this.roomManager = new RoomManager(this)
    this.roomManager.setGrids([this.structureMap, this.armorMap, this.platformMap])
    this.roomManager.setPlatformGrids([this.platformMap])
    this.roomManager.setOnRoomCreateSuccessListener(this)
  }

  onRoomCreateSuccess(room) {
  }

  initPowerManager() {
    this.powerManager = new PowerManager(this)
    this.powerManager.setGrids([this.structureMap, this.distributionMap])
  }


  setPositionFromVelocity() {
    const prev = { x: this.getX(), y: this.getY() }

    super.setPositionFromVelocity()

    const curr = { x: this.getX(), y: this.getY() }

    for (let mobId in this.mobs) {
      let mob = this.mobs[mobId]
      this.setPositionFromParentAndEmitListeners(mob)
    }

    for (let crewId in this.crews) {
      let crew = this.crews[crewId]
      this.setPositionFromParentAndEmitListeners(crew)
    }

    for (let platformId in this.platforms) {
      let platform = this.platforms[platformId]
      this.setPositionFromParentAndEmitListeners(platform)
    }

    for (let armorId in this.armors) {
      let armor = this.armors[armorId]
      this.setPositionFromParentAndEmitListeners(armor)
    }

    for (let shipId in this.structures) {
      let ship = this.structures[shipId]
      this.setPositionFromParentAndEmitListeners(ship)
    }

    for (let pickupId in this.pickups) {
      let pickup = this.pickups[pickupId]
      this.setPositionFromParentAndEmitListeners(pickup)
    }

    for (let unitId in this.units) {
      let unit = this.units[unitId]
      this.setPositionFromParentAndEmitListeners(unit)
    }

    if (this.shield) {
      this.setPositionFromParentAndEmitListeners(this.shield)
    }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()
    }
  }

  getBodyProperties(x, y) {
    return {
        mass: 1,
        position: [x,y],
        type: p2.Body.DYNAMIC
    }
  }

  getBoundingBox() {
    if (!this.polygon) {
      return super.getBoundingBox()
    }

    const satAABB = this.polygon.getAABB()
    const width  = satAABB.edges[0].x
    const height = satAABB.edges[1].y

    return {
      minX: satAABB.pos.x ,
      minY: satAABB.pos.y,
      maxX: satAABB.pos.x + width,
      maxY: satAABB.pos.y + height
    }
  }

  getBuilding(data) {
    return this.structures[data.id]
  }

  getPlatform(data) {
    return this.platforms[data.id]
  }

  getArmor(data) {
    return this.armors[data.id]
  }

  getUnit(data) {
    return this.units[data.id]
  }

  setPilot(pilot) {
    this.pilot = pilot

    pilot.relativePosition[0] = this.bridge.getRelativeX()
    pilot.relativePosition[1] = this.bridge.getRelativeY() + 48

    pilot.becomePilot(this)
  }

  unsetPilot(pilot) {
    this.pilot = null
    let platform = this.findTopLeftVertex().entity
    const radianAwayFromShip = this.getRadAngle() - Math.PI
    let point = this.game.pointFromDistance(platform.getX(), platform.getY(), Constants.tileSize, radianAwayFromShip)
    pilot.body.position[0] = point[0]
    pilot.body.position[1] = point[1]
    pilot.body.aabbNeedsUpdate = true
    pilot.unmountPilot(this)
  }

  isShip() {
    return true
  }

  isEmpty() {
    return Object.keys(this.platforms).length === 0 &&
           Object.keys(this.armors).length === 0 &&
           Object.keys(this.structures).length === 0 &&
           Object.keys(this.distributions).length === 0 &&
           Object.keys(this.units).length === 0
  }

  getAlliance() {
    if (this.pilot) {
      return this.pilot.getAlliance()
    } else {
      return this.owner.getAlliance()
    }
  }

  setShipSector(sector) {
    // refactor later on (ship should have no clue about how sector handles datastructure)
    const prevSector = this.sector
    if (prevSector) {
      delete prevSector.ships[this.id]
    }

    this.sector = sector

    if (sector) {
      this.register()
    }
  }

  register() {
    this.sector.ships[this.id] = this
    this.sector.insertEntityToTreeByName(this, "shipTree")
  }

  insertEntityToTreeByName() {
    // not implemented yet
  }

  mobilizeCrew() {
    let crews = Object.values(this.crews)
    crews.forEach((crew) => {
      crew.setDormant(false)
      this.removeCrew(crew)
    })
  }

  setSector(sector) {
    this.setShipSector(sector)
    this.setComponentsSector(sector)
  }

  setComponentsSector(sector) {
    for (let platformId in this.platforms) {
      let platform = this.platforms[platformId]
      platform.sector = sector
    }

    for (let armorId in this.armors) {
      let armor = this.armors[armorId]
      armor.sector = sector
    }

    // change sector of ships
    for (let structureId in this.structures) {
      let structure = this.structures[structureId]
      structure.sector = sector
    }

    for (let unitId in this.units) {
      let unit = this.units[unitId]
      unit.dockUnit()
      unit.sector = sector
    }

    if (this.shield) {
      this.shield.sector = sector
    }
  }

  removeBuilding(building) {
    building.remove()
  }

  removeAllBuildings() {
    for (let buildingId in this.platforms) {
      let platform = this.platforms[buildingId]
      this.removeBuilding(platform)
    }

    for (let buildingId in this.armors) {
      let armor = this.armors[buildingId]
      this.removeBuilding(armor)
    }

    for (let buildingId in this.structures) {
      let building = this.structures[buildingId]
      this.removeBuilding(building)
    }

    for (let buildingId in this.units) {
      let unit = this.units[buildingId]
      this.sector.removeUnit(unit)
    }
  }

  destroyAllBuildings() {
    for (let buildingId in this.platforms) {
      let building = this.platforms[buildingId]
      building.setHealth(0)
    }

    for (let buildingId in this.armors) {
      let building = this.armors[buildingId]
      building.setHealth(0)
    }

    for (let buildingId in this.structures) {
      let building = this.structures[buildingId]
      building.setHealth(0)
    }

    for (let buildingId in this.units) {
      let building = this.units[buildingId]
      building.setHealth(0)
    }
  }

  getOwnerId() {
    return this.owner && this.owner.id
  }

  toJson() {
    const platformComponents = Object.keys(this.platforms).map((buildingId) => {
      return this.platforms[buildingId].toJson()
    })

    const armorComponents = Object.keys(this.armors).map((buildingId) => {
      return this.armors[buildingId].toJson()
    })

    const structureComponents = Object.keys(this.structures).map((buildingId) => {
      return this.structures[buildingId].toJson()
    })

    const unitComponents = Object.keys(this.units).map((buildingId) => {
      return this.units[buildingId].toJson()
    })

    const distributionComponents = Object.keys(this.distributions).map((buildingId) => {
      return this.distributions[buildingId].toJson()
    })

    const pickupComponents = Object.keys(this.pickups).map((buildingId) => {
      return this.pickups[buildingId].toJson()
    })

    const buildingComponents = [platformComponents, armorComponents, structureComponents, unitComponents, distributionComponents].flat()
    const shieldComponent = this.shield ? this.shield.toJson() : null

    let json = {
      id: this.id,
      x: Math.round(this.getX()),
      y: Math.round(this.getY()),
      health: this.health,
      angle: this.angle,
      speed: this.getSpeed(),
      level: this.level,
      buildings: buildingComponents,
      pickups: pickupComponents,
      shield: shieldComponent,
      rowCount: this.getRowCount(),
      colCount: this.getColCount()
    }

    if (process.env.DEBUG_COLLISION) {
      json["collider"] = this.getColliderJson()
    }

    if (this.owner) {
      json["ownerId"] = this.owner.id
    }

    return json
  }

  recreatePolygon() {
    // this.polygon = (new SAT.Box(new SAT.Vector(this.getX(), this.getY()), 20, 40)).toPolygon()

    let points = this.getSATPolygonPoints()
    if (points.length === 0) return

    this.polygon = new SAT.Polygon(new SAT.Vector(this.getX(), this.getY()), points)
    this.polygon.setAngle(this.getRadAngle())
  }

  getSATPolygonPoints() {
    if (!this.satPolygonPoints) {
      const vertices = this.findSortedVertices()

      const relativeCenter = {
        x: this.getColCount() / 2 * Constants.tileSize,
        y: this.getRowCount() / 2 * Constants.tileSize
      }

      this.satPolygonPoints = vertices.map((hit) => {
        let x = hit.col * Constants.tileSize + Constants.tileSize / 2
        let y = hit.row * Constants.tileSize + Constants.tileSize / 2
        return new SAT.Vector(x - relativeCenter.x, y - relativeCenter.y)
      })
    }

    return this.satPolygonPoints
  }

  findTopLeftVertex() {
    let vertices = this.findVertices()
    // closest distance to 0,0
    return vertices.sort((hit, otherHit) => {
      let distanceA =  this.game.distance(hit.col, hit.row, 0, 0)
      let distanceB =  this.game.distance(otherHit.col, otherHit.row, 0, 0)
      return distanceA - distanceB
    })[0]
  }

  findSortedVertices() {
    let vertices = this.findVertices()
    if (vertices.length === 0) return []

    // closest distance to 0,0
    let topLeft = vertices.sort((hit, otherHit) => {
      let distanceA =  this.game.distance(hit.col, hit.row, 0, 0)
      let distanceB =  this.game.distance(otherHit.col, otherHit.row, 0, 0)
      return distanceA - distanceB
    })[0]

    // clockwise distance to topLeft
    vertices.sort((hit, otherHit) => {
      let angleA =  this.game.angle(topLeft.col, topLeft.row, hit.col, hit.row)
      let angleB =  this.game.angle(topLeft.col, topLeft.row, otherHit.col, otherHit.row)
      return angleA - angleB
    })
    let topLeftIndex = vertices.indexOf(topLeft)
    vertices.splice(topLeftIndex, 1)
    vertices.unshift(topLeft)

    return vertices
  }

  getFloodFillManager() {
    if (!this.floodFillManager) {
      this.floodFillManager = new FloodFillManager(this, { name: "ship_platform", container: this, queue: this.floodFillQueue.getQueue() })
      this.floodFillManager.setGrids([this.platformMap])
      this.floodFillManager.setStopIdentifier(this.shouldStopFloodFill.bind(this))
      this.floodFillManager.setIncludeStopIdentifier(this.shouldIncludeStop.bind(this))

    }

    return this.floodFillManager
  }

  shouldStopFloodFill(hit, neighbors) {
    return neighbors.find((neighbor) => {
      return neighbor.type === 0  // empty space neighbor
    })
  }

  shouldIncludeStop(hit) {
    return hit.entity // only if not empty space
  }

  findVertices() {
    // floodfille platform
    let platform = Object.values(this.platforms)[0]
    if (!platform) return []

    let floodFillManager = this.getFloodFillManager()

    let vertices = []

    floodFillManager.floodFill(platform.getRow(), platform.getCol(), {}, (tile, neighbors, sourceHit) => {
      if (neighbors.length === 2) {
        vertices.push(tile)
      }
    })

    return vertices
  }

  getColliderJson() {
    if (!this.polygon) return []

    const pos = this.polygon.pos
    return this.polygon.calcPoints.map((point, index) => {
      return {
        id: index,
        x: Math.floor(pos.x + point.x),
        y: Math.floor(pos.y + point.y)
      }
    })
  }


}

Object.assign(Ship.prototype, Movable.prototype, {
  getSpeed() {
    return this.speed || 0 // initial 0
  }
})

Object.assign(Ship.prototype, Container.prototype, {
  getCollidableGrids() {
    return [this.armorMap, this.structureMap]
  },
  onComponentAdded(entity) {
    // only care about platforms
    if (!entity.hasCategory("platform")) return

    this.satPolygonPoints = null

    const center = {
      x: this.getColCount() * Constants.tileSize / 2,
      y: this.getRowCount() * Constants.tileSize / 2
    }

    const relativeToShipCenterX = entity.getRelativeX() - center.x
    const relativeToShipCenterY = entity.getRelativeY() - center.y

    this.body.addShape(entity.getShape(), [relativeToShipCenterX, relativeToShipCenterY])
    if (!this.blueprint.isInProgress) {
      this.recreatePolygon()
    }
  },
  onComponentRemoved(entity) {
    // only care about platforms
    if (!entity.hasCategory("platform")) return

    this.satPolygonPoints = null
    this.body.removeShape(entity.shape)

    if (!this.isMarkedForRemoval) {
      this.recreatePolygon()
    }
  },
  getRowCount() {
    return this.blueprint.rowCount
  },
  getColCount() {
    return this.blueprint.colCount
  }
})

Object.assign(Ship.prototype, Destroyable.prototype, {
  onHealthZero() {
    if (this.pilot) {
      this.pilot.setHealth(0)
    } else {
      this.owner.setHealth(0)
    }
  },
  onPostSetHealth(delta) {
  },
  getMaxHealth() {
    return this.shipCore ? this.shipCore.getMaxHealth() : 0
  }
})


module.exports = Ship
