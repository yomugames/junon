const Constants = require("./../../../common/constants")
const Helper = require("./../../../common/helper")
const Protocol = require('../../../common/util/protocol')
const Taintable = require('../../../common/interfaces/taintable')
const BaseBuildingCommon = require('../../../common/entities/base_building_common')
const NetworkAssignable = require('../../../common/interfaces/network_assignable')
const Definable = require('../../../common/interfaces/definable')
const Categorizable = require("./../../../common/interfaces/categorizable")
const BoundingBox = require("./../../../common/interfaces/bounding_box")

class BaseTerrain  {

  static build(data, buildContainer) {
    let row = Math.floor(data.y / Constants.tileSize)
    let col = Math.floor(data.x / Constants.tileSize)

    let existingTerrain = buildContainer.groundMap.get(row, col)
    if (existingTerrain) {
      existingTerrain.remove({ removeAll: true })
    }

    if (data.type === Protocol.definition().TerrainType.Sky) {
      // remove any structures
      buildContainer.removeAllBuildings(row, col)
      return null
    }

    return new this(buildContainer, row, col)
  }

  constructor(sector, row, col) {
    if (this.constructor.isInvalidRowCol(sector, row, col)) {
      throw new Error("Invalid row,col: " + [row, col].join(",") + " for " + this.getName())
    }

    this.sector = sector
    this.game = sector.game
    this.row = row
    this.col = col
    this.type = this.getType()
    this.onBuildingPlaced(row, col)

    this.initTaintable({ shouldPopulate: true })

    this.onStateChanged()
  }

  getTypeName() {
    return Helper.getTerrainNameById(this.getType())
  }

  static isInvalidRowCol(sector, row, col) {
    return row < 0 || col < 0 || row >= sector.groundMap.getRowCount() || col >= sector.groundMap.getColCount()
  }

  isLava() {
    return false
  }


  getStats(level) {
    return this.getConstants().stats || {}
  }

  addToRoomNetwork() {
    if (!this.hasRoomRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount(), entity: this }
    this.sector.roomManager.allocateNetwork(options)
  }

  isCoordValid(container, x, y) {
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return !container.isOutOfBounds(row, col)
  }

  isWall() {
    return false
  }

  isCarpet() {
    return false
  }

  isCrop() {
    return false
  }

  growFire() {
    let fireDurationTimestamp = this.game.timestamp - this.getEffectCreatedAt("fire")
    if (fireDurationTimestamp > (Constants.physicsTimeStep * 5)) {
      this.removeFire()
    }
  }

  hasCustomColors() {
    return false
  }

  getEntityGroup() {
    return "terrains" 
  }

  isLightBlocker() {
    return this.getConstants().isLightBlocker
  }

  isCollidableBuildingOrTerrain() {
    return this.isCollidable()
  }

  addBuildActivity(player) {
    let owner = player.getTeam()

    this.sector.addActivityLog({
      username: player.name, 
      activityType: Protocol.definition().ActivityType.Build,
      entityType: this.type,
      entityGroup: Protocol.definition().EntityGroup.Building,
      owner: owner,
      row: this.getRow(),
      col: this.getCol()
    })
  }

  use() {
    // nothing
  }

  static use() {
    // nothing
  }

  removeFromRoomNetwork() {
    if (!this.hasRoomRole()) return
    if (!this.sector.roomManager) return

    let options = { row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1, entity: this }
    this.sector.roomManager.removeMember(this)
    this.sector.roomManager.partition(options)
  }

  getLastMinedHealth() {
    if (!this.lastMinedHealth) return this.getMaxHealth()

    return this.lastMinedHealth
  }

  isRepairable() {
    return true
  }

  setLastMinedHealth(health) {
    this.lastMinedHealth = health
  }

  onActionReleased() {

  }

  getRequirements() {
    return {}  
  }

  hasRoomRole() {
    return this.hasCategory("wall")
  }

  isDestroyable() {
    return false
  }

  isWater() {
    return false
  }

  getId() {
    let absoluteIndex = this.row * this.sector.getColCount() + this.col
    return [this.getType(), absoluteIndex].join("-")
  }

  getContainer() {
    return this.sector
  }

  getName() {
    let label = this.getConstants().label
    if (label) return label

    const type = this.getType()
    const typeName = Helper.getTerrainNameById(type).replace(/([A-Z])/g, ' $1').trim() // space before capital letters
    return [typeName, this.row, this.col].join("-")
  }

  isBuilding() {
    return false
  }

  static getRotatedWidth() {
    return this.prototype.getRotatedWidth()
  }

  static getRotatedHeight() {
    return this.prototype.getRotatedHeight()
  }

  getRotatedWidth() {
    return this.getWidth()
  }

  getRotatedHeight() {
    return this.getHeight()
  }

  static isPositionValid(container, x, y, w, h, angle) {
    if (container.platformMap.isOccupied(x, y, w, h)) return false

    return true
  }

  hasChanged() {
    if (this.getTotalEffectValue() > 0) return true
    if (this.health && this.health !== this.getMaxHealth()) return true

    return false
  }

  getRow() {
    return this.row
  }

  getAlliance() {
    return this
  }

  isMineable() {
    return false
  }

  isMob() {
    return false
  }

  getWidth() {
    return Constants.tileSize
  }

  getContinent() {
    let chunkRegion = this.getChunkRegion()  
    if (!chunkRegion) return null
    return chunkRegion.getContinent()
  }

  getChunkRegion() {
    let chunk = this.getChunk()
    return chunk.getChunkRegion(this.getRow(), this.getCol())
  }

  getChunkRegions() {
    let result = {}
    let chunkRegion = this.getChunkRegion()
    if (chunkRegion) result[chunkRegion.getId()] = chunkRegion
    return result
  }

  getHeight() {
    return Constants.tileSize
  }

  // Room Manager: START

  getHits() {
    return [{ row: this.getRow(), col: this.getCol(), entity: this }]
  }

  getTileType() {
    return this.getType()
  }

  isDestroyed() {
    return false
  }

  getFlowField() {
    let pathFinder = this.sector.pathFinder
    if (!pathFinder) return null

    return pathFinder.flowFields[this.getId()]
  }

  removeFlowField() {
    let flowField = this.getFlowField()
    if (flowField) {
      flowField.remove()
    }
  }

  isCollidable() {
    return false
  }

  shouldCollideEdge() {
    return false
  }

  getCol() {
    return this.col
  }

  shouldObstruct() {
    return this.isObstacle()
  }

  isObstacle() {
    return false
  }

  isDrainable() {
    return false
  }

  isEffectsChanged() {
    return this.effects && Object.keys(this.effects).length > 0
  }

  getSpeedMultiplier() {
    if (this.sector.hasGravity()) {
      return 1
    }

    return this.getConstants().speedMultiplier || 1
  }

  getStandingPlatform() {
    return this
  }

  addBlood() {
    if (!this.sector.settings['isBloodEnabled']) return
    this.setEffectLevel("blood", this.getEffectLevel("blood") + 1)
  }

  isOnFire() {
    return false
  }

  isPlayer() {
    return false
  }

  isPassableByPathFinder() {
    return this.isGroundTile() || this.isUndergroundTile()
  }

  onStateChanged() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.addChangedTerrains(this)
    }
  }

  getTileMap() {
    return this.sector.groundMap
  }


  isSkyTile() {
    return false
  }

  isGround() {
    return this.isGroundTile()
  }

  isTerrain() {
    return true
  }

  onBuildingPlaced(row, col) {
    this.getTileMap().set({ row: row, col: col, value: this })
  }

  unregister() {
    this.getTileMap().set({ row: this.row, col: this.col, value: 0 })
  }

  isRockFloor() {
    return true
  }

  remove(options = {}) {
    this.setRemoved(true)

    this.removeFromRoomNetwork()
    this.unregister()

    this.clientMustDelete = true
    this.onStateChanged()
  }

  getCoord() {
    return [this.getRow(), this.getCol()]
  }

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  }

  getChunkRow() {
    return Math.floor(this.row / Constants.chunkRowCount )
  }

  getChunkCol() {
    return Math.floor(this.col / Constants.chunkRowCount )
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Resource
  }

  getRelativeBox() {
    return this.getBox()
  }

  getCollisionBox() {
    return this.getBox()
  }

  getCollisionMask() {
    return 0
  }

  hasFood() {
    return false
  }

  getCircle() {
    return { x: this.getX(), y: this.getY() , radius: this.getWidth()/2 }
  }

  static getType() {
    return this.prototype.getType()
  }

  static isUsable() {
    return false
  }

  sync(data) {
    this.health = data.health
    this.effects = data.effects
  }

  removeListener() {

  }

  addMoveListener() {
    
  }

}

Object.assign(BaseTerrain.prototype, Taintable.prototype, {
  isFlamable() {
    return false
  },
  onEffectAdded(effect) {
    if (effect === "fire") {
      this.sector.addFlame(this)
    }
  },
  onEffectRemoved(effect) {
    if (effect === "fire") {
      this.sector.removeFlame(this)
    }
  },
  onEffectLevelChanged(effect, level) {
    this.onStateChanged()
  }
})

Object.assign(BaseTerrain.prototype, BaseBuildingCommon.prototype, {
})

Object.assign(BaseTerrain.prototype, Definable.prototype, {
})


Object.assign(BaseTerrain.prototype, NetworkAssignable.prototype, {
})

Object.assign(BaseTerrain.prototype, BoundingBox.prototype, {
  getX() {
    return this.col * Constants.tileSize + Constants.tileSize/2
  },
  getY() {
    return this.row * Constants.tileSize + Constants.tileSize/2
  }
})

Object.assign(BaseTerrain.prototype, Categorizable.prototype, {
  isBottleFillable() {
    return this.hasEffect("blood") || this.getConstants().isBottleFillable
  }
})




module.exports = BaseTerrain
