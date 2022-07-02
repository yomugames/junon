const p2 = require("p2")
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const SocketUtil = require("junon-common/socket_util")
const Destroyable = require('../../../common/interfaces/destroyable')
const Powerable = require('../../../common/interfaces/powerable')
const NetworkAssignable = require('../../../common/interfaces/network_assignable')
const Upgradable = require("../../../common/interfaces/upgradable")
const BaseEntity = require('../base_entity')
const ShipMountable = require('../../../common/interfaces/ship_mountable')
const Taintable = require('../../../common/interfaces/taintable')
const Storable = require('../../../common/interfaces/storable')
const BaseBuildingCommon = require("../../../common/entities/base_building_common")
const Helper = require('../../../common/helper')
const ResourceStorage = require('../resource_storage')
const ExceptionReporter = require('junon-common/exception_reporter')
const Team = require("../team")
const _ = require('lodash')

class BaseBuilding extends BaseEntity {
  static build(data, container) {
    if (typeof data.type === "string") {
      data.type = Protocol.definition().BuildingType[data.type]
    }

    return new this(data, container)
  }

  static getConstantsTable() {
    return this.prototype.getConstantsTable()
  }

  constructor(data, container) {
    super(container.sector, data)

    this.container = container

    if (!this.isCoordValid(container, data.x, data.y, this.getWidth(), this.getHeight())) {
      this.stopConstruction()          
    }

    this.replaceExistingTiles()

    if (this.dontBuild) {
      this.game.unregisterEntity(this)
      return
    }

    this.initVariables()
    this.initResourceStorage()
    this.initBuildingStorage()

    this.initTaintable({ shouldPopulate: true })
    this.initDestroyable()

    this.applyData(data)

    this.onBuildingPlaced()

    if (this.hasBuildProgress()) {
      if (this.isConstructionFinished()) {
        this.onConstructionFinished()
      }
    } else {
      this.onConstructionFinished()
    }

    this.updateRbushCoords()
    this.onStateChanged()
  }

  addToNetworks() {
    this.addToRoomNetwork()
    this.addToPowerNetwork()
    this.addToOxygenNetwork()
    this.addToLiquidNetwork()
    this.addToFuelNetwork()
    this.addToRailNetwork()
    this.addToSoilNetwork()
  }

  setIsCustomAccess(isCustomAccess) {
    this.isCustomAccess = isCustomAccess
    this.onStateChanged("isCustomAccess")
  }

  canBeSalvagedBy(player) {
    if (!this.isReachableFromRoom(player.getOccupiedRoom())) {
      return false
    }

    if (this.game.isPvP()) {
      if (this.isOwnedBy(player)) {
        return true
      } else {
        return this.hasCategory("platform") || this.hasCategory("pipe") || this.hasCategory("wire")
      }
    } else {
      return this.isOwnedBy(player)
    }
  }

  isRepairable() {
    if (this.isCrop()) return false
    return this.getHealth() < this.getMaxHealth()
  }

  setNeighbors(neighbors) {
    let left  = !!neighbors[0].entity ? 1 : 0
    let top   = !!neighbors[1].entity ? 1 : 0
    let right = !!neighbors[2].entity ? 1 : 0
    let down  = !!neighbors[3].entity ? 1 : 0

    // or operation against bit index 
    this.neighbors = 0
    this.neighbors = this.neighbors | (left  << 3)
    this.neighbors = this.neighbors | (top   << 2)
    this.neighbors = this.neighbors | (right << 1)
    this.neighbors = this.neighbors | (down  << 0)

    this.onStateChanged("neighbors")
  }

  getPlacer() {
    if (!this.placer) return null
    if (this.placer.isPlayerData()) {
      let playerId = this.placer.data.id
      let player = this.game.players[playerId]
      if (player) return player
    } else {
      return this.placer
    }
  }

  onEffectLevelChanged(effect, level) {
    super.onEffectLevelChanged(effect, level)

    if (effect === "dirt") {
      let chunkRegion = this.getChunkRegion()
      if (chunkRegion) {
        if (level > 0) {
          chunkRegion.setDirt(this.getRow(), this.getCol(), level)
        } else {
          chunkRegion.unsetDirt(this.getRow(), this.getCol())
        }
      }
    }
  }

  isInteractDisabled(user) {
    return this.isConstructionInProgress()
  }

  getInteractDistance() {
    return Constants.tileSize * 10
  }

  shouldCollideEdge() {
    return true
  }

  normalizeAngle(angle) {
    angle = angle % 360

    if (angle === 270) {
      angle = -90
    }

    return angle
  }

  applyData(data) {
    this.isPlacedByPlayerAction = data.isPlacedByPlayerAction
    this.angle     = this.normalizeAngle(data.angle || 0)

    if (data.hasOwnProperty("origAngle")) {
      this.origAngle = this.normalizeAngle(data.origAngle)
    } else {
      this.origAngle = this.angle
    }

    this.content = data.content
    this.usage = data.usage

    if (data.health) {
      this.health = Math.min(data.health, this.getMaxHealth())
    }

    if (this.sector.hasInfinitePower()) {
      this.setPowerStatus(true)
    } else if (data.isPowered) {
      this.setPowerStatus(data.isPowered)
    }

    if (data.isHarvestable) {
      this.isHarvestable = data.isHarvestable
    }

//     if (data.decayStartTimestamp) {
//       this.setDecayStartTimestamp(data.decayStartTimestamp)
//     }
// 
    if (data.owner) {
      let owner = this.game.getEntity(data.owner.id)
      this.setOwner(owner)
    }

    if (data.accessType) {
      this.accessType = data.accessType
    } else {
      this.accessType = this.getDefaultAccessType()
    }

    if (data.isCustomAccess) {
      this.isCustomAccess = data.isCustomAccess
    }

    if (data.placer) {
      this.placer = this.game.getEntity(data.placer.id)
    }

    if (data.hasOwnProperty("isUnderConstruction")) {
      this.isUnderConstruction = data.isUnderConstruction
    }

    if (this.hasBuildProgress() && data.hasOwnProperty("buildProgress") && this.owner) {
      this.startConstruction(data.buildProgress)
    }

    if (data.targets) {
      this.targets = data.targets      
    } else if (this.getDefaultTargets()) {
      this.targets = this.getDefaultTargets()
    }

    if (data.hasOwnProperty("colorIndex")) {
      this.colorIndex = data.colorIndex
    }

    if (data.hasOwnProperty("textureIndex")) {
      this.textureIndex = data.textureIndex
    }

    if (data.level) {
      this.setLevel(data.level)
    }

    if (data.name) {
      this.setName(data.name)
    }

    if (data.containerId) {
      this.container = this.game.getEntity(data.containerId)

      this.setPositionFromParent()
    }

    if (data.storage) {
      for (let index in data.storage) {
        try {
          this.applySavedStorage(data, index)
        } catch(e) {
          this.game.captureException(e)
        }
      }
    }

    if (typeof data.isOpen !== 'undefined') {
      this.isOpen = data.isOpen
    }

    if (data.isWatered) {
      this.isWatered = data.isWatered
    }

    if (data.effects) {
      for (let effectName in data.effects) {
        let level = data.effects[effectName]
        if (level) {
          this.setEffectLevel(effectName, level)
        }
      }
    }

    if (data.resourceStorages) {
      for (let resource in data.resourceStorages) {
        let usage = data.resourceStorages[resource].usage
        this.resourceStorages[resource].setUsage(usage)
      }
    }
  }

  isSlaveAllowedToAccess() {
    if (this.hasCategory("storage")) {
      if (this.isCustomAccess) {
        return this.isRolePermitted(Team.SlaveRoleType)
      } else if (this.hasCategory("mining_drill")) {
        return true
      } else {
        return true
      }
      
    } else {
      return true
    }
  }

  hasCustomColors() {
    return false
  }

  getDefaultTargets() {

  }

  getDefaultAccessType() {
    if (this.hasCategory("editable_permissions")) {
      let result = 0
      result += (1 << Team.MemberRoleType)
      result += (1 << Team.AdminRoleType)
      result += (1 << Team.SlaveRoleType)
      return result
    }
  }

  editTargetType(targetType, isEnabled) {
    if (!isEnabled) {
      // and operation against bit index with 0 while rest is 1
      let disableMask = ~(1 << targetType)

      this.targets = this.targets & disableMask
    } else {
      // or operation against bit index with 1 while rest is 0
      let enableMask = (1 << targetType)

      this.targets = this.targets | enableMask
    }

    this.onStateChanged("targets")
  }

  editPermission(roleType, isEnabled) {
    if (!isEnabled) {
      // and operation against bit index with 0 while rest is 1
      let disableMask = ~(1 << roleType)

      this.accessType = this.accessType & disableMask
    } else {
      // or operation against bit index with 1 while rest is 0
      let enableMask = (1 << roleType)

      this.accessType = this.accessType | enableMask
    }

    this.onStateChanged("accessType")
  }

  upgrade(player) {
    if (!this.game.isPvP()) return
    if (!this.getConstants().isUpgradable) return
    if (this.level >= 1) return
    if (!player.canAfford(this.getUpgradeCost())) {
      player.showError("Not enough gold", { isWarning: true })
      return
    }

    player.reduceGold(this.getUpgradeCost())

    this.level = 1
    this.setHealth(this.health * 2)
    this.onStateChanged("level")
  }

  isRolePermitted(roleType) {
    return (this.accessType >> roleType) % 2 === 1
  }

  canInteract() {
    if (this.hasPowerRole()) return this.hasMetPowerRequirement()
    return true
  }

  hasMetPowerRequirement() {
    return this.sector.hasInfinitePower() || this.isPowered
  }

  isTargetEnabled(targetType) {
    return (this.targets >> targetType) % 2 === 1
  }

  applySavedStorage(data, index) {
    let itemData = data.storage[index]
    this.sector.addPendingStore(this.id, index, itemData)
  }

  getMaxContentLength() {
    return this.getConstants().maxContentLength || 25
  }

  hasCustomPermissions() {
    return typeof this.accessType !== 'undefined'
  }

  isAllowedToView(entity) {
    if (!entity.isPlayer()) return true
    if (entity.isAdmin()) return true

    if (this.isCustomAccess) {
      return this.isRolePermitted(entity.roleType)
    } else if (this.hasCategory("mining_drill")) {
      return entity.getRole().isAllowedTo("AccessMiningDrill")
    } else {
      return entity.getRole().isAllowedTo("AccessStorage")
    }
  }

  startConstruction(buildProgress) {
    this.isUnderConstruction = true
    this.buildProgress = buildProgress
    this.sector.addPendingBuilding(this.owner, this)
  }

  isCoordValid(container, x, y, w, h) {
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    let isNotPlacedOnGrid = w === Constants.tileSize && 
                            h === Constants.tileSize && 
                            (x % Constants.tileSize === 0 || 
                             y % Constants.tileSize === 0)

    if (isNotPlacedOnGrid) {
      return false
    }

    return !container.isOutOfBounds(row, col)
  }

  hasBuildProgress() {
    if (!this.game.isPvP()) return false

    if (this.hasCategory("instant_build")) return false

    return this.isPathFindBlocker()
  }

  isConstructionFinished() {
    return this.buildProgress === null || typeof this.buildProgress === 'undefined'
  }

  isConstructionInProgress() {
    return !this.isConstructionFinished()
  }

  increaseGold(cost) {
    this.setGold(this.getGold() + cost)
  }

  reduceGold(cost) {
    this.setGold(this.getGold() - cost)
  }

  setGold(amount) {
    if (amount < 0) amount = 0
    if (amount > 2**32) amount = 2**32
    let delta = this.content ? amount - parseInt(this.content) : amount
    this.setBuildingContent(amount.toString())
    this.onGoldChanged(delta)
  }

  getGold() {
    return this.content ? parseInt(this.content) : 0
  }

  onGoldChanged(delta) {

  }

  getSellStorage() {
    return this.storage
  }

  constructBuilding() {
    if (this.isRemoved) {
      this.buildProgress = null
    }

    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    let buildProgressInterval = debugMode ? 100 : 20
    this.setBuildProgress(this.buildProgress + buildProgressInterval)
  }

  setBuildProgress(progress) {
    this.buildProgress = progress

    this.onBuildProgressChanged()

    if (this.buildProgress > 110) {
      this.buildProgress = null
      this.onConstructionFinished()
    }
  }

  onBuildProgressChanged() {
    this.onStateChanged("buildProgress")
  }

  onConstructionFinished() {
    this.isUnderConstruction = false

    this.addToNetworks()

    if (this.isStructure()) {
      this.postBuildingConstructedForStructure()
    }

    if (this.isPathFindBlocker() || this.isExtendingGround()) {
      this.updatePathFinder()
    }
  }

  isExtendingGround() {
    let ground = this.getContainer().groundMap.get(this.getRow(), this.getCol())
    if (!ground) return true

    return !ground.isGroundTile()
  }

  isDrainable() {
    return false
  }

  isBottleFillable() {
    if (this.hasEffect("blood")) return true

    return super.isBottleFillable()
  }

  isWater() {
    return false
  }

  initBuildingStorage() {
    if (this.getConstants().storageCount) {
      this.initStorable(this.getConstants().storageCount)
    }
  }

  getPlayer() {
    return this.placer
  }

  addBuildActivity(player) {
    this.sector.addActivityLog({
      username: player.name, 
      activityType: Protocol.definition().ActivityType.Build,
      entityId: this.id,
      entityType: this.type,
      entityGroup: Protocol.definition().EntityGroup.Building,
      owner: this.getOwner(),
      row: this.getRow(),
      col: this.getCol()
    })
  }

  getOwnerName() {
    if (!this.getOwner()) return ""

    return this.getOwner().name
  }

  dismantle() {
    if (this.lastBreaker) {
      this.lastBreaker.progressTutorial("main", 5)
      if (this.lastBreaker.isPlayer()) {
        this.lastBreaker.walkthroughManager.handle("dismantle")

        this.game.triggerEvent("BuildingDeconstructed", {
            entityId: this.id,
            entityType: this.getTypeName(),
            player: this.lastBreaker.getName(),
            playerId: this.lastBreaker.getId()
        })
      }

      this.sector.addActivityLog({
        username: this.lastBreaker.name, 
        activityType: Protocol.definition().ActivityType.Deconstruct,
        entityId: this.id,
        entityType: this.type,
        entityGroup: Protocol.definition().EntityGroup.Building,
        owner: this.getOwner(),
        row: this.getRow(),
        col: this.getCol()
      })
    }


    this.isDismantled = true
    this.sector.createDrop({ sector: this.sector, x: this.getX(), y: this.getY(), type: this.getType(), count: 1 })
    this.remove()
  }

  getStorageCount() {
    return this.getConstants().storageCount
  }

  postBuildingConstructedForStructure() {
    this.container.homeArea.addToHomeArea(this)
  }

  isEntityStorage() {
    return false
  }

  isReachableFromRoom(room) {
    let isNotReachable =  this.getOccupiedRoom() &&
                          this.getOccupiedRoom() !== room &&
                          this.getOccupiedRoom().hasDoor()
    return !isNotReachable
  }

  addViewSubscriber(player) {
    this.viewSubscribers = this.viewSubscribers || {}
    this.viewSubscribers[player.id] = player
    player.viewSubscriptions[this.id] = this
  }

  getViewSubscribers() {
    this.viewSubscribers = this.viewSubscribers || {}

    return this.viewSubscribers
  }

  removeViewSubscriber(player) {
    this.viewSubscribers = this.viewSubscribers || {}
    delete this.viewSubscribers[player.id]
    delete player.viewSubscriptions[this.id]
  }

  isPassableByPathFinder() {
    if (this.hasCategory("rail")) return true

    return this.hasCategory("door") || this.hasCategory("platform") || this.isPathPassable()
  }

  // path finder related
  isPathPassable() {
    return this.getConstants().isPassable
  }

  addShape() {
    // shape is not added by default
  }

  getName() {
    return Helper.getTypeNameById(this.getType()) + this.id + "-" + [this.getRow(), this.getCol()].join(":")
  }

  executeTurn() {

  }

  isBuilding() {
    return true
  }

  isCraftingStorage() {
    return false
  }

  setBuildingContent(content) {
    let oldContent = this.content
    if (this.content !== content) {
      this.content = content
      this.onBuildingContentChanged(oldContent, this.content)
    }
  }

  setAccessType(accessType) {
    if (this.accessType !== accessType) {
      this.accessType = accessType
      this.onAccessTypeChanged()
    }
  }

  getBuildingContent() {
    return this.content
  }

  onOpenStateChanged() {
    this.onStateChanged("isOpen")
  }

  onAccessTypeChanged() {
    this.onStateChanged("accessType")
  }

  onBuildingContentChanged() {
    this.onStateChanged("content")
  }

  isConsumable() {
    return false
  }

  breakBuilding(lastBreaker) {
    this.lastBreaker = lastBreaker
    this.breakProgress = this.breakProgress || 0
    this.setBreakProgress(this.breakProgress + 1)
    this.resetRestoreCounter()
  }

  onActionReleased() {
    this.setBreakProgress(0)
  }

  setBreakProgress(breakProgress) {
    let prevBreakProgress = this.breakProgress

    if (breakProgress > this.getMaxBreak()) {
      this.breakProgress = this.getMaxBreak()
    } else if (breakProgress < 0) {
      this.breakProgress = 0
    } else {
      this.breakProgress = breakProgress
    }

    if (prevBreakProgress !== this.breakProgress) {
      this.onBreakProgressChanged()
    }
  }

  reduceBreak() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (this.stopBreaking) {
      this.setBreakProgress(this.breakProgress - 1)

      if (this.breakProgress === 0) {
        this.getContainer().removeBreaking(this)
      }
    }
  }

  isCraftingStorage() {
    return this.getConstants().isCraftingStorage
  }

  incrementRestoreCounter() {
    if (this.stopBreaking) return

    this.restoreCounter = this.restoreCounter || 0
    if (this.restoreCounter >= Constants.physicsTimeStep) {
      this.stopBreaking = true
    } else {
      this.restoreCounter += 1
    }
  }

  resetRestoreCounter() {
    this.restoreCounter = 0
    this.stopBreaking = false
  }

  onBreakProgressChanged() {
    if (!this.container.isMovable()) {
      let chunk = this.getChunk()
      if (chunk) {
        chunk.addBrokenBuildings(this)
      }
    }

    if (this.getBreakProgress() === this.getMaxBreak()) {
      this.dismantle()
      this.getContainer().removeBreaking(this)
    } else {
      this.getContainer().addBreaking(this)
    }
  }

  getMaxBreak() {
    return 2
  }

  getRadOrigAngle() {
    return this.origAngle * (Math.PI / 180)
  }

  getBreakProgress() {
    if (!this.breakProgress) return 0
    return Math.floor(this.breakProgress)
  }

  isNotForSale() {
    return false
  }

  getAlliance() {
    if (this.owner) {
      return this.owner.getAlliance()
    } else {
      return null
    }
  }

  isFriendlyUnit(targetEntity) {
    if (!targetEntity.getAlliance()) return true // unowned things are friendly

    return this.getAlliance() === targetEntity.getAlliance()
  }

  withdraw() {

  }

  validateSellable() {
    return { }
  }

  shouldObstruct() {
    return !this.getConstants().isPassable
  }

  isMaxUpgradeReached() {
    return Object.keys(this.getUpgradeProgress()).length === 0
  }

  getRotatedWidth() {
    let w = this.getWidth()
    let h = this.getHeight()
    if (w === h) return w

    return Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * w + Math.abs(Math.sin(this.getRadOrigAngle())) * h)
  }

  getRotatedHeight() {
    let w = this.getWidth()
    let h = this.getHeight()
    if (w === h) return h

    return Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * h + Math.abs(Math.sin(this.getRadOrigAngle())) * w)
  }

  static getRotatedWidth(angle) {
    let radian = angle * (Math.PI / 180)
    return Math.round(Math.abs(Math.cos(radian)) * this.getConstants().width + Math.abs(Math.sin(radian)) * this.getConstants().height)
  }

  static getRotatedHeight(angle) {
    let radian = angle * (Math.PI / 180)
    return Math.round(Math.abs(Math.cos(radian)) * this.getConstants().height + Math.abs(Math.sin(radian)) * this.getConstants().width)
  }

  isShipCore() {
    return false
  }

  static numOfTilesMultiplier() {
    return this.getConstants().width / Constants.tileSize
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.prototype.getBox(x, y, w, h))
    const hasSoil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return !hasSoil &&
           this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !this.hasRailNeighbor(container, x, y, w, h) &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
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

  static hasRailNeighbor(container, x, y, w, h) {
    let paddedBox = this.getPaddedRelativeBox(this.getBox(x,y,w,h))
    return container.railMap.hitTestTile(paddedBox).find((hit) => {
      return hit.entity
    })
  }


  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let box = this.getBox(x, y, w, h)
    let checkFull = false
    let excludeOutOfBounds = false

    let groundHits = container.groundMap.hitTestTile(box, checkFull, excludeOutOfBounds)
    let isAllPlatform = groundHits.every((hit) => {
      if (!hit.entity) {
        return container.platformMap.get(hit.row, hit.col)
      }

      if (!hit.entity.isGroundTile()) {
        return container.platformMap.get(hit.row, hit.col)
      }

      return true
    })

    return isAllPlatform

  }

  static isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player) {
    return false
  }


  static isOnHangar(container, x, y, w, h) {
    return false
    const hits = container.platformMap.hitTestTile(this.getBox(x, y, w, h))
    return hits.find((hit) => { return hit.entity && hit.entity.isHangar() })
  }

  isPowerConverter() {
    return false
  }

  getProcessingRate() {
    if (this.customProcessingRate) {
      return this.customProcessingRate
    }

    return this.getStats(this.level).processingRate || 1
  }

  setProcessingRate(processingRate) {
    this.customProcessingRate = processingRate
  }

  updateRbushCoords() {
    let x = this.getX()
    let y = this.getY()
    let w = this.getRotatedWidth()
    let h = this.getRotatedHeight()

    this.minX = x - w/2,
    this.minY = y - h/2,
    this.maxX = x + w/2,
    this.maxY = y + h/2
  }

  setOwner(owner) {
    let prevOwner = this.owner
    this.owner = owner
    this.onStateChanged("owner")

    if (!this.owner) {
      this.onOwnershipLost()
    } else {
      this.onOwnershipGainedOrChanged()
    }

    if (prevOwner !== owner) {
      this.onOwnerChanged(prevOwner, owner)
    }
  }

  hasStructureOnTop() {
    let row = this.getRow()
    let col = this.getCol()
    return this.container.structureMap.get(row, col)
  }

  hasBuildingOnTop() {
    let result = false

    let row = this.getRow()
    let col = this.getCol()

    let maps = [
      this.container.armorMap,
      this.container.structureMap,
      this.container.distributionMap,
      this.container.liquidDistributionMap,
      this.container.gasDistributionMap,
      this.container.railMap
    ]

    for (var i = 0; i < maps.length; i++) {
      let map = maps[i]
      if (map.get(row, col)) {
        result = true
        break
      }
    }

    return result
  }

  getWorkPosition() {
    let centerRow = this.getRow()
    let centerCol = this.getCol()
    let tileDistance = 1

    let radAngles = [this.getRadAngle(), Math.PI + this.getRadAngle()] // bottom + top positions
    let coord

    for (var i = 0; i < radAngles.length; i++) {
      let radAngle = radAngles[i]
      let row = centerRow - parseInt(Math.sin(radAngle).toFixed()) * tileDistance
      let col = centerCol - parseInt(Math.cos(radAngle).toFixed()) * tileDistance

      if (this.isValidRowCol(row, col)) {
        let tile = this.container.pathFinder.getTile(row, col)
        if (tile && !tile.isPathFindBlocker()) {
          coord = { row: row, col: col, radAngle: radAngle }
          break
        }
      }
    }

    if (!coord) return null

    return {
      radAngle: coord.radAngle,
      x: coord.col * Constants.tileSize + Constants.tileSize/2,
      y: coord.row * Constants.tileSize + Constants.tileSize/2
    }
  }

  isValidRowCol(row, col) {
    if (row < 0 || col < 0) return false
    if (row >= this.getContainer().getRowCount() || col >= this.getContainer().getColCount()) return false

    return true
  }

  onOwnerChanged(prevOwner, owner) {
    if (prevOwner) {
      prevOwner.unregisterOwnership(this.getGroup(), this)
    }

    if (owner) {
      owner.registerOwnership(this.getGroup(), this)
    }
  }

  onOwnershipGainedOrChanged() {
    this.unowned = false
    this.onStateChanged("unowned")
  }

  onOwnershipLost() {
    this.unowned = true
    this.onStateChanged("unowned")
  }

  // setDecayStartTimestamp(decayStartTimestamp) {
  //   this.decayStartTimestamp = decayStartTimestamp
  //   this.sector.registerBuildingDecay(this)
  //   this.onStateChanged("decayStartTimestamp")
  // }

  setPlacer(placer) {
    this.placer = placer
  }

  getContainer() {
    return this.container
  }

  getOxygenNetwork() {
    return this.oxygenNetwork
  }

  getLiquidNetwork() {
    return this.liquidNetwork
  }

  getFuelNetwork() {
    return this.fuelNetwork
  }

  getPowerNetwork() {
    return this.powerNetwork
  }

  getRailNetwork() {
    return this.railNetwork
  }

  getSoilNetwork() {
    return this.soilNetwork
  }

  initVariables() {
    this.type = this.getType()
    this.isUnderConstruction = false
  }

  increaseLevel() {
    this.level = this.level || 0
    this.setLevel(this.level + 1)
  }

  setLevel(level) {
    this.level = level
    this.onLevelChanged()
  }

  onLevelChanged() {
    this.setHealth(this.getMaxHealth())
    this.onStateChanged("level")
  }

  isDestroyable() {
    return true
  }

  alive() {
    return true
  }

  getX() {
    if (this.container.isMovable()) {
      return this.getAbsoluteXOnContainer()
    }

    return super.getX()
  }

  getY() {
    if (this.container.isMovable()) {
      return this.getAbsoluteYOnContainer()
    }

    return super.getY()
  }

  replaceWallsIfPresent() {
    let hits = this.container.armorMap.hitTestTile(this.getRelativeBox())
    hits.forEach((hit) => {
      if (hit.entity && hit.entity.hasCategory("wall")) {
        hit.entity.remove()
      }
    })
  }

  floodFillWater() {

  }

  replaceExistingTiles() {
    const box = this.getRelativeBox()
    let map = this.container[this.getMapName()]
    let hits = map.hitTestTile(box)
    hits.forEach((hit) => {
      if (hit.entity) hit.entity.replace()
    })
  }

  onBuildingPlaced() {
    this.container.registerComponent(this.getGroup(), this.getMapName(), this)

    // when loading save file, we want to batch insert into tree
    // so dont do it one by one
    if (!this.sector.shouldDisableBuildingTreeInsert) {
      this.sector.insertEntityToTreeByName(this, "buildings")
    }

    if (this.sector.sectorLoader.isFinished) {
      this.updateNeighbors()
    }
  }

  updateStructureNeighbors() {
    this.getSideHitTileMaps().forEach((tilemap) => {
      const neighborTiles = this.getNeighborTilesForStructure(tilemap, this.getRelativeBox())
      for (var i = 0; i < neighborTiles.length; i++) {
        let hit = neighborTiles[i]
        if (hit.entity) {
          hit.entity.updateNeighbors({ ignoreStructures: true })
        }
      }
    })
  }

  updateNeighbors(options = {}) {
    let neighbors = []
    if (this.isWall()) {
      neighbors = this.container.roomManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})
      neighbors.forEach((neighbor) => {
        if (neighbor.entity && !neighbor.entity.isWall()) {
          neighbor.entity = null
        }
      })

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.isCarpet()) {
      neighbors = this.container.platformMap.getNeighborsAllowEmpty(this.getRow(), this.getCol())
      neighbors.forEach((neighbor) => {
        if (neighbor.entity && !neighbor.entity.isCarpet()) {
          neighbor.entity = null
        }
      })

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.hasCategory("wire")) {
      neighbors = this.container.powerManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.getType() === Protocol.definition().BuildingType.GasPipe) {
      neighbors = this.container.oxygenManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.getType() === Protocol.definition().BuildingType.FuelPipe) {
      neighbors = this.container.fuelManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.getType() === Protocol.definition().BuildingType.LiquidPipe) {
      neighbors = this.container.liquidManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.getType() === Protocol.definition().BuildingType.RailTrack) {
      neighbors = this.container.railManager.getNeighbors({ row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1})

      // set neighbor bits..
      this.setNeighbors(neighbors)
    } else if (this.isStructure() && !options.ignoreStructures) {
      this.updateStructureNeighbors()
      return
    }

    let bitValue = options.shouldRemoveSelf ? 0 : 1
    for (var i = 0; i < neighbors.length; i++) {
      let neighbor = neighbors[i]
      if (neighbor.entity) {
        let direction = this.getOppositeNeighborDirection(i)
        neighbor.entity.setNeighborBit(direction, bitValue)
      }
    }
  }

  getSideHitTileMaps() {
    let tileMaps = [this.getMap()]

    if (this.hasPowerRole())  tileMaps.push(this.container.distributionMap)
    if (this.hasLiquidRole()) tileMaps.push(this.container.liquidDistributionMap)
    if (this.hasOxygenRole()) tileMaps.push(this.container.gasDistributionMap)
    if (this.hasFuelRole())   tileMaps.push(this.container.fuelDistributionMap)

    return tileMaps
  }

  getNeighborTilesForStructure(tilemap, relativeBox) {
    const paddedRelativeBox = this.getPaddedRelativeBox(relativeBox)
    let   coreHits = tilemap.hitTestTile(relativeBox)
    let   paddedHits = tilemap.hitTestTile(paddedRelativeBox)

    return paddedHits.filter((hit) => {
      const isPartOfCore = coreHits.find((coreHit) => {
        return coreHit.row === hit.row && coreHit.col === hit.col
      })
      return !isPartOfCore
    })
  }


  setNeighborBit(direction, bit) {
    let shiftValue = this.getShiftValueByDirection(direction)

    if (typeof this.neighbors === 'undefined') this.neighbors = 0

    if (bit === 0) {
      // disable
      let disableMask = ~(1 << shiftValue)
      this.neighbors = this.neighbors & disableMask
    } else {
      let enableMask = (1 << shiftValue)
      this.neighbors = this.neighbors | enableMask
    }

    this.onStateChanged("neighbors")
  }

  getShiftValueByDirection(direction) {
    if (direction === "left")  return 3
    if (direction === "up")    return 2
    if (direction === "right") return 1
    if (direction === "down")  return 0
  }

  getOppositeNeighborDirection(index) {
    if (index === 0) return "right" 
    if (index === 1) return "down"
    if (index === 2) return "left"
    if (index === 3) return "up"
  }

  addToRoomNetwork() {
    if (!this.hasRoomRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount(), entity: this }
    this.container.roomManager.allocateNetwork(options)
  }

  addToPowerNetwork() {
    if (!this.hasPowerRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.powerManager.allocateNetwork(options)
  }

  addToOxygenNetwork() {
    if (!this.hasOxygenRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.oxygenManager.allocateNetwork(options)
  }

  addToLiquidNetwork() {
    if (!this.hasLiquidRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.liquidManager.allocateNetwork(options)
  }

  addToFuelNetwork() {
    if (!this.hasFuelRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.fuelManager.allocateNetwork(options)
  }

  addToRailNetwork() {
    if (!this.hasRailRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.railManager.allocateNetwork(options)
  }

  addToSoilNetwork() {
    if (!this.hasSoilRole()) return

    const options = { entity: this, row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.soilManager.allocateNetwork(options)
  }

  unregister() {
    this.container.unregisterComponent(this.getGroup(), this.getMapName(), this)
    this.sector.removeEntityFromTreeByName(this, "buildings")
    // this.sector.unregisterBuildingDecay(this)

    if (this.isStructure()) {
      this.container.homeArea.removeFromHomeArea(this)
    }
  }

  removeFromRoomNetwork() {
    if (!this.hasRoomRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount(), entity: this }

    let room = this.getRoom()
    let wasEdgeTile = room ? room.isEdgeTile(options) : false

    this.container.roomManager.removeMember(this)

    if (room && !this.isReplaced) {
      this.addGroundToNetwork(room, wasEdgeTile)
    }

    if (this.isRoomPartitioner() || this.isRemovedPlatformRoomConnector()) {
      if (!this.isReplaced) {
        this.container.roomManager.partition(options)
      }
    }

  }

  addGroundToNetwork(room, wasEdgeTile) {
    if (!this.hasCategory('platform')) return false

    let row = this.getRow()
    let col = this.getCol()

    let entity = this.container.groundMap.get(row, col)
    if (entity) {
      let hit = { row: row, col: col, entity: entity, rowCount: 1, colCount: 1 }
      if (wasEdgeTile) {
        let neighbors = this.container.roomManager.getNeighbors(hit)
        room.addEdgeTile(hit, neighbors)
      } else {
        room.addTile(hit)
      }

      room.assignNetworkToEntity(hit, room)
    }
  }

  getContinents() {
    let continents = {}

    let chunkRegions = this.getChunkRegions()
    for (let id in chunkRegions) {
      let continent = chunkRegions[id].getContinent()
      if (continent) {
        continents[continent.getId()] = continent
      }

    }

    return continents
  }

  isRemovedPlatformRoomConnector() {
    if (!this.hasCategory('platform')) return false

    let hit = this.container.groundMap.get(this.getRow(), this.getCol())
    return !hit
  }

  removeFromPowerNetwork() {
    if (!this.hasPowerRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.powerManager.removeMember(this)
    this.container.powerManager.partition(options)
  }

  removeFromOxygenNetwork() {
    if (!this.hasOxygenRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.oxygenManager.removeMember(this)
    this.container.oxygenManager.partition(options)
  }

  removeFromLiquidNetwork() {
    if (!this.hasLiquidRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.liquidManager.removeMember(this)
    this.container.liquidManager.partition(options)
  }

  removeFromFuelNetwork() {
    if (!this.hasFuelRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.fuelManager.removeMember(this)
    this.container.fuelManager.partition(options)
  }

  removeFromRailNetwork() {
    if (!this.hasRailRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.railManager.removeMember(this)
    this.container.railManager.partition(options)
  }

  removeFromSoilNetwork() {
    if (!this.hasSoilRole()) return

    let options = { row: this.getTopLeftRow(), col: this.getTopLeftCol(), rowCount: this.getRowCount(), colCount: this.getColCount() }
    this.container.soilManager.removeMember(this)
    this.container.soilManager.partition(options)
  }

  invalidateRailFlowFields() {
    if (!this.hasRailRole()) return

    let railNetwork = this.getRailNetwork()
    if (!railNetwork) return

    railNetwork.invalidateFlowFieldsFor(this)
  }

  getRotatedAngle() {
    if (this.container.isMovable()) {
      return this.container.getAngle() + this.getAngle()
    }

    return this.getAngle()
  }

  getRotatedRadAngle() {
    return this.getRotatedAngle() * (Math.PI / 180)
  }

  getRelativeBox() {
    if (!this.container.isMovable()) {
      return this.getBox(this.getX(), this.getY(), this.getRotatedWidth(), this.getRotatedHeight())
    } else {
      return this.getBox(this.getRelativeX(), this.getRelativeY(), this.getRotatedWidth(), this.getRotatedHeight())
    }
  }

  getHits() {
    const relativeBox = this.getRelativeBox()
    let hits = this.getMap().hitTestTile(relativeBox)

    // we dont care if its not on the grid/map yet, entity should be this
    hits.forEach((hit) => {
      hit.entity = this
    })

    return hits
  }

  isBuildingStorage() {
    return true
  }

  getMapName() {
    return "structureMap"
  }

  getGroup() {
    return "structures"
  }

  getMap() {
    return this.container.structureMap
  }

  getTileType() {
    return this.getType()
  }

  getType() {
    throw new Error("must implement BaseBuilding#getType")
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  getCollisionMask() {
    return Constants.collisionGroup.Player
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Building
  }

  updatePathFinder() {
    let pathFinder = this.getContainer().pathFinder
    if (pathFinder) {
      let chunks = this.getChunks()
      for (let id in chunks) {
        let chunk = chunks[id]
        pathFinder.invalidateChunk(chunk)
      }
    }
  }

  hasStorage() {
    return this.getConstants().storageCount
  }

  removeStorageItems() {
    if (this.hasStorage()) {
      this.forEachItem((item) => {
        if (item.isItem()) {
          this.throwInventory(item)
        }
      })
    }
  }

  canStoreInBuilding(index, item) {
    return true
  }

  replace() {
    this.isReplaced = true
    this.remove()
  }

  stopConstruction() {
    this.dontBuild = true
  }

  remove() {
    this.setRemoved(true)

    if (this.shouldNotifyRemoval()) {
      this.clientMustDelete = true
      this.onStateChanged("clientMustDelete")
    }

    this.removeStorageItems()
    this.invalidateRailFlowFields()

    this.unregister()

    this.removeFromRoomNetwork()
    this.removeFromPowerNetwork()
    this.removeFromOxygenNetwork()
    this.removeFromLiquidNetwork()
    this.removeFromFuelNetwork()
    this.removeFromRailNetwork()
    this.removeFromSoilNetwork()

    if (this.isPathFindBlocker() || this.hasCategory("platform")) {
      this.updatePathFinder()
    }

    if (this.isPathFindBlocker()) {
      this.removeNeighborFlowFields()
    }

    if (this.sector.sectorLoader.isFinished) {
      this.updateNeighbors({ shouldRemoveSelf: true })
    }

    // already unregistered from game by the time its removed, now you can emit events
    super.remove()
  }

  removeNeighborFlowFields() {
    let neighbors = this.getNeighbors()
    neighbors.forEach((neighbor) => {
      neighbor.entity.removeFlowField()
    })
  }

  shouldNotifyRemoval() {
    return true
  }

  static getMaxCountFor(ship) {
    return this.prototype.getStats(ship.level).count
  }

  static getType() {
    return this.prototype.getType()
  }

  onRoomOxygenatedChanged() {

  }

  getRowCount() {
    return this.getRotatedHeight() / Constants.tileSize
  }

  getColCount() {
    return this.getRotatedWidth() / Constants.tileSize
  }

  static use(player, targetEntity) {
    // nothing
  }

  addBlood() {
    if (!this.sector.settings['isBloodEnabled']) return
    this.setEffectLevel("blood", this.getEffectLevel("blood") + 1)
  }

  getSpeedMultiplier() {
    let multiplier = 1

    for (let effect in this.effects) {
      let value = this.effects[effect]
      if (value > 0) {
        multiplier *= this.getEffectSpeedMultiplier(effect)
      }
    }

    return multiplier
  }

  getEffectSpeedMultiplier(effect) {
    let multipliers = {
      "dirt": 0.9,
      "blood": 0.8,
      "water": 0.8,
      "slime": 0.7,
      "web": 0.6
    }

    return multipliers[effect] || 1
  }

  isFlamable() {
    if (typeof this.getConstants().isFlamable !== 'undefined') {
      return this.getConstants().isFlamable
    }

    if (this.game.isPvP()) {
      return this.isStructure() || this.hasCategory("crop")
    } else {
      return this.isStructure() || this.hasCategory("crop")
    }
  }

  onStateChanged(attribute) {
    super.onStateChanged(attribute)

    if (!this.sector.sectorLoader.isFinished) return

    if (!this.container.isMovable()) {
      let chunk = this.getChunk()
      if (chunk) {
        chunk.addChangedBuildings(this)
      }
    }
  }

  getChunkRegion() {
    let chunk = this.getChunk()

    let found

    this.forEachOccupiedTile((row, col) => {
      if (!found) {
        let chunkRegion = chunk.getChunkRegion(row, col)
        if (chunkRegion) {
          found = chunkRegion
        }
      }
    })

    return found
  }

  getNeighbors() {
    let result = {}

    let pathFinder = this.getContainer().pathFinder

    this.forEachOccupiedTile((row, col) => {
      let neighbors = pathFinder.floodFillManager.getNeighbors(row, col)
      neighbors.forEach((neighbor) => {
        if (neighbor.entity) {
          result[neighbor.entity.getId()] = neighbor
        }
      })
    })

    return Object.values(result)
  }

  forEachOccupiedTile(cb) {
    let topLeftRow = this.getTopLeftRow()
    let topLeftCol = this.getTopLeftCol()
    let rowCount   = this.getRowCount()
    let colCount   = this.getColCount()

    for (let row = topLeftRow; row < topLeftRow + rowCount; row++) {
      for (let col = topLeftCol; col < topLeftCol + colCount; col++) {
        cb(row, col)
      }
    }
  }

  getIsPowered() {
    if (!this.isPowered) return false
    return this.isPowered
  }

  getResourceStoragesJson() {
    let result = {}

    for (let resource in this.resourceStorages) {
      result[resource] = this.resourceStorages[resource].usage
    }

    return result
  }

  getTeam() {
    if (!this.owner) return null
    if (!this.owner.isTeam()) return null
    return this.owner
  }

  getDrainables() {

  }

  setColorIndex(colorIndex) {
    this.colorIndex = colorIndex
  }

  setTextureIndex(textureIndex) {
    this.textureIndex = textureIndex
  }

  setContainsFood(containsFood) {
    this.containsFood = containsFood
  }

  setContainsFoodIngredient(containsFoodIngredient) {
    this.containsFoodIngredient = containsFoodIngredient
  }

  setContainsBulletAmmo(containsBulletAmmo) {
    this.containsBulletAmmo = containsBulletAmmo
  }

  setContainsMissileAmmo(containsMissileAmmo) {
    this.containsMissileAmmo = containsMissileAmmo
  }

  setContainsSeed(containsSeed) {
    this.containsSeed = containsSeed
  }

  setContainsBottle(containsBottle) {
    this.containsBottle = containsBottle
  }

  hasFood() {
    return this.containsFood
  }

  hasFoodIngredient() {
    return this.containsFoodIngredient
  }

  hasIngredientWithCount(ingredientType, count) {
    let countMet = false
    let currentCount = 0

    for (let index in this.storage) {
      let item = this.storage[index]
      if (item && item.type === ingredientType) {
        currentCount += item.count
        if (currentCount >= count) {
          countMet = true
          break
        }

      }
    }

    return countMet
  }

  canAddEffect(effectName) {
    if (effectName === "spin") return false
    return true
  }

  hasBulletAmmo() {
    return this.containsBulletAmmo
  }

  hasMissileAmmo() {
    return this.containsMissileAmmo
  }

  hasAmmoType(ammoType) {
    if (ammoType === "BulletAmmo") return this.hasBulletAmmo()
    if (ammoType === "Missile") return this.hasMissileAmmo()
    return false
  }

  setName(name) {
    this.name = name
    this.onStateChanged('name')
  }

  getAmmoType() {
    return null
  }

  getAmmoTypeId() {
    let ammoType = this.getAmmoType()
    if (!ammoType) return null

    return Protocol.definition().BuildingType[ammoType]
  }

  hasSeed() {
    return this.containsSeed
  }

  hasBottle() {
    return this.containsBottle
  }

  checkDrainableUsage() {
    for (let resource in this.resourceStorages) {
      let drainable = this.resourceStorages[resource]
      drainable.checkUsage()
    }
  }

  hasEditableContent() {
    return this.getConstants().hasEditableContent
  }

  setLocaleContent(locale, text) {
    if (!this.localeContents) this.localeContents = {}
    this.localeContents[locale] = text
    this.onStateChanged("localeContents")
  }

  shouldRemoveOwner() {
    if (this.getConstants().skipRemoveOwner) return false
    return true
  }

  static isEqual(json, otherJson) {
    return _.isEqual(json, otherJson)
  }

}

Object.assign(BaseBuilding.prototype, Upgradable.prototype, {
})

Object.assign(BaseBuilding.prototype, Destroyable.prototype, {
  onDamaged(attacker, amount) {
    let data = {
      entityId: this.getId(),
      entityType: this.getTypeName(),
      attackingPlayer: "",
      attackingPlayerRole: "",
      attackingMob: "",
      damage: amount
    }

    if (attacker) {
      let actor = this.getKillerFromAttacker(attacker)
      if (actor) {
        data["attackerId"] = actor.id
        if (actor.isPlayer()) {
          data["attackingPlayer"] = actor.name
          data["attackingPlayerRole"] = actor.getRoleName()
        } else if (actor.isMob()) {
          data["attackingMob"] = actor.id
        }
      }
    }

    this.game.triggerEvent("BuildingAttacked", data)
  },
  isDestroyed() {
    return this.health === 0 || this.isDismantled
  },
  onHealthZero() {
    this.remove()

    let data = {
      entityId: this.getId()
    }
    this.game.triggerEvent("BuildingDestroyed", data)
  },
  onHealthReduced(delta) {
    if (!this.getOwner()) return
    if (this.getOwner().isTeam()) {
      this.getOwner().forEachMember((member) => {
        SocketUtil.emit(member.getSocket(), "MapAction", { action: "drawDamage", row: this.getTopLeftRow(), col: this.getTopLeftCol() })
      })
    } else if (this.getOwner().isPlayer()) {
      SocketUtil.emit(this.getOwner().getSocket(), "MapAction", { action: "drawDamage", row: this.getTopLeftRow(), col: this.getTopLeftCol() })
    }
  },
  getMaxHealth() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].health
      }

      if (this.sector.buildingCustomStats[this.type]) {
        return this.sector.buildingCustomStats[this.type].health
      }
    }

    return this.getStats(this.level).health
  },
  onPostSetHealth(delta) {
    if (this.isHealthFull()) {
      this.game && this.game.triggerEvent("HealthFull", { entityId: this.getId(), entityType: this.getType() })
    }
    this.onStateChanged("health")

    if (!this.isCrop()) {
      let data = {
        "entityId": this.id, 
        "entityType": this.getTypeName(), 
        "playerId": "",
        "player": "",
        "previous": (this.health - delta),
        "current": this.health,
        "delta": delta
      }

      this.game.triggerEvent("HealthChanged", data)
    }
  }
})

Object.assign(BaseBuilding.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.relativeX
  },
  getRelativeY() {
    return this.relativeY
  }
})

Object.assign(BaseBuilding.prototype, BaseBuildingCommon.prototype, {
})

Object.assign(BaseBuilding.prototype, Powerable.prototype, {
  onPowerChanged() {
    this.onStateChanged("usage")
    this.onStateChanged("isPowered")
    this.game.triggerEvent("IsPowerChanged", { entityId: this.getId(), isPowered: this.isPowered })
  }
})

Object.assign(BaseBuilding.prototype, NetworkAssignable.prototype, {
  onNetworkAssignmentChanged(networkName) {
    
    if (networkName === 'railNetwork') {
      this.game.triggerEvent("NetworkAssignmentChanged:Rail", { entityId: this.getId() })
    }
    
    this.onStateChanged(networkName)
  }
})

Object.assign(BaseBuilding.prototype, ResourceStorage.prototype, {
  onDrainableDelayed() {
    this.sector.addPendingDrainable(this)
  },
  onUsageChanged(resource, usage) {
    this.onStateChanged("resourceStorages")
    this.game.triggerEvent("BuildingResourceChanged", { entityType: this.getType(), entityId: this.id, resource: resource, usage: usage })
  }
})

Object.assign(BaseBuilding.prototype, Storable.prototype, {
  canStore(index, item) {
    return this.canStoreInBuilding(index, item)
  },
  onStorageChanged(item, index) {
    let newlyStoredItem = this.get(index)
    if (newlyStoredItem && this.shouldRemoveOwner()) {
      item.setOwner(null)
    }

    let containsFood = false
    let containsBulletAmmo = false
    let containsMissileAmmo = false
    let containsSeed = false
    let containsBottle = false
    let containsFoodIngredient = false

    this.forEachItem((item) => {
      if (!item.isMob() && !item.isCorpse()) {
        if (item.isEdible())   containsFood = true
        if (item.isFoodIngredient())   containsFoodIngredient = true
        if (item.isBulletAmmo()) containsBulletAmmo = true
        if (item.isMissileAmmo()) containsMissileAmmo = true
        if (item.isSeed())   containsSeed = true
        if (item.isBottle()) containsBottle = true
      }
    })

    this.setContainsFood(containsFood)
    this.setContainsFoodIngredient(containsFoodIngredient)
    this.setContainsBulletAmmo(containsBulletAmmo)
    this.setContainsMissileAmmo(containsMissileAmmo)
    this.setContainsSeed(containsSeed)
    this.setContainsBottle(containsBottle)
  }
})

module.exports = BaseBuilding
