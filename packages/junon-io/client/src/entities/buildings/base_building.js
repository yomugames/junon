const BaseEntity  = require("./../base_entity")
const Destroyable  = require("./../../../../common/interfaces/destroyable")
const Powerable  = require("./../../../../common/interfaces/powerable")
const Upgradable = require("./../../../../common/interfaces/upgradable")
const ShipMountable = require("./../../../../common/interfaces/ship_mountable")
const Resource = require("./../../../../common/interfaces/resource")
const Conductor = require("./../../../../common/interfaces/conductor")
const Drainable = require("./../../../../common/interfaces/drainable")
// const Tileable  = require("./../../../../common/interfaces/tileable")
const Constants = require("./../../../../common/constants.json")
const HealthBar = require("./../../components/health_bar")
const ProgressBar = require("./../../components/progress_bar")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")
const SocketUtil = require("../../util/socket_util")
const ClientHelper = require("./../../util/client_helper")
const SpriteEventHandler = require("./../../util/sprite_event_handler")
const BaseBuildingCommon = require("./../../../../common/entities/base_building_common")
const NetworkSprite = require("./../network_sprite")
const BitmapText = require("../../util/bitmap_text")

let attributeHandlers = {}

class BaseBuilding extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }

  static numOfTilesMultiplier() {
    return this.getConstants().width / Constants.tileSize
  }

  static getGroup() {
    return "structures"
  }

  static initAttributeHandlers() {
    for (let attribute in Protocol.definition().Building.fields) {
      attributeHandlers[attribute] = "set" + Helper.capitalize(attribute)
    }
  }

  getSelectionSprite() {
  }

  getTiles() {
    let hits = this.container.groundMap.hitTestTile(this.getRelativeBox())
    return hits.map((hit) => {
      return { row: hit.row, col: hit.col }
    })
  }

  static getSellGroup() {
    return "Buildings"
  }

  constructor(game, data) {
    super(game, data)

    this.collider = data.collider
    this.isLaunched = data.isLaunched
    this.isEquipDisplay = data.isEquipDisplay
    this.fireLevel = data.fireLevel
    this.owner = data.owner
    this.level = data.level || 0
    this.isStatic = true
    this.lightings = []
    this.lighting  = null
    this.networks = {}
    this.networkSprites = {}
    this.chunks = {}
    this.localeContents = {}

    this.row = this.getRow()
    this.col = this.getCol()

    if (this.isEquipDisplay) {
      this.buildingSprite.alpha = 0.7
      this.setBaseRotation(this.getDefaultRotation())
      this.setAngle(this.getDefaultRotation())
      this.postBuildingEquipDisplayed()
    } else if (!this.isEquipment()) {
      this.setBaseRotation(data.origAngle)
      this.setAngle(data.angle)
      this.initDestroyable()
      this.getChunk().register("buildings", this)
      this.onBuildingConstructed() // subclasses might override

      if (data.hasOwnProperty('buildProgress')) {
        this.setBuildProgress(data.buildProgress)
      }

      this.assignLighting()
      this.updateChunkSprite()

      this.postBuildingConstructed()
    }

    this.health = data.health
    // this.initColliderDebug()
    this.drawColliderDebug()
  }

  postBuildingEquipDisplayed() {
    if (this.game.isMobile()) {
      // this.game.buildActionMenu.position.x =
    }
  }

  onShadowRendered() {

  }

  isEquipment() {
    return false
  }

  getStorageCount() {
    return this.getConstants().storageCount
  }

  getTintableSprite() {
    return this.buildingSprite
  }

  isNotForSale() {
    return false
  }

  isMaxUpgradeReached() {
    return Object.keys(this.getUpgradeProgress()).length === 0
  }

  isUsable() {
    return this.shouldShowInteractTooltip() || this.hasMenu()
  }

  setIsOpen(isOpen) {
    if (this.isOpen !== isOpen) {
      this.isOpen = isOpen
      this.onOpenChanged()
    }
  }

  setTargets(targets) {
    let prevTargets = this.targets
    this.targets = targets

    if (this.targets !== prevTargets) {
      if (this.game.entityMenu.isOpen(this)) {
        this.game.entityMenu.update(this)
      }
    }
  }

  getEffectableSprite() {
    return this.buildingSprite
  }

  onOpenChanged() {
    this.sector.onSelectionChanged(this.sector.selection.selectedEntity)
  }

  break(breakProgress) {
    this.isBreaking = true

    this.setEffectLevel("break", breakProgress)
  }

  initColliderDebug() {
    if (!this.collider) return
    this.colliderSprite = new PIXI.Graphics()
    this.colliderSprite.name = "collider"
    this.getSpriteContainer().addChild(this.colliderSprite)
  }

  getMenuDescription() {
    return this.getConstants().menuDescription
  }

  drawColliderDebug() {
    return
    if (!this.collider) return

    let points = this.collider.map((point) => { return [point.x, point.y] })
    points = [].concat.apply([], points)
    this.colliderSprite.clear()
    this.colliderSprite.lineStyle(5, 0xff0000, 0.7)
    this.colliderSprite.drawPolygon(points)
    this.colliderSprite.endFill()
  }

  setCollider(collider) {
    this.collider = collider
    this.drawColliderDebug()
  }

  isShipCore() {
    return false
  }

  getDefaultRotation() {
    return -90
  }

  static getMaxCountFor(ship) {
    return this.prototype.getStats(ship.level).count
  }

  onClick(options) {
    if (this.isEquipDisplay) return

    if (this.game.isChunkDisplayEnabled) {
      this.handleDoubleClick(() => {
        this.game.showChunkRegionPathForEntity(this)
      })
    }

    if (!Helper.isTargetWithinRange(this.game.player, this)) {
      return
    }

    let shouldProceedClick = this.clickBuilding(options)
    if (!shouldProceedClick) return

    if (this.hasCategory("power_consumer") ) {
      if (this.isPowered) {
        this.onPostClick()
      }
    } else {
      this.onPostClick()
    }
  }

  onPostClick() {

  }

  clickBuilding(options) {
    if (this.game.player.isControllingGhost()) return

    this.game.selectEntity(this)
    this.game.showEntityMenu(this, { dontCloseMenus: true, selectedEntity: this, replaceSelected: true })

    if (options.isRightClick) {
      this.game.interact(this)
    }

    return true
  }

  hasRangeDisplay() {
    return false
  }

  onMouseOver() {
    super.onMouseOver()

    if (this.isEquipDisplay) return

    let distance = Helper.distance(this.game.player.getX(), this.game.player.getY(), this.getX(), this.getY())
    if (!Helper.isTargetWithinRange(this.game.player, this)) {
      return
    }

    if (this.hasRangeDisplay()) {
      this.drawRange()
    }

    this.game.player.setActTarget(this)

    if (this.shouldShowEntityMenu()) {
      this.game.showEntityMenu(this, { dontCloseMenus: true })
    }

    if (this.isInteractable() && !this.game.player.isControllingGhost()) {
      this.game.highlight(this)
      this.game.player.setMouseTarget(this)
    }
  }

  shouldShowInteractTooltip() {
    if (this.isConstructionInProgress()) return false

    return super.shouldShowInteractTooltip()
  }

  shouldShowEntityMenu() {
    return true
  }

  onMouseOut() {
    super.onMouseOut()

    if (this.isEquipDisplay) return

    this.isMouseOver = false
    this.game.player.setMouseTarget(null)

    if (this.hasRangeDisplay()) {
      this.hideRange()
    }

    if (this.game.player.getActTarget() === this) {
      this.game.player.setActTarget(null)
    }

    if (this.shouldShowEntityMenu()) {
      this.game.hideEntityMenu()
    }

    if (this.isInteractable()) {
      this.game.unhighlight(this)
    }
  }

  belongsToPlayer(player) {
    return this.owner && this.owner.id === player.getBuildOwnerId()
  }

  static getUpgradeProgress() {
    return this.prototype.getUpgradeProgress()
  }

  getUpgradeType() {
    return "buildings"
  }

  animateDestruction() {
    const smokeCount = 4
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }
  }

  isTower() {
    return false
  }

  rotateEquip() {
    let currentRotation = this.angle
    currentRotation += 90
    if (currentRotation === 270) {
      currentRotation = -90
    }
    this.setAngle(currentRotation)
    this.setBaseRotation(currentRotation)

    let lastClientX = this.game.inputController.lastClientX
    let lastClientY = this.game.inputController.lastClientY

    this.renderAtMousePosition(lastClientX, lastClientY)

    this.renderInvalidArea()
  }

  setBaseRotation(angle) {
    if (this.baseRotation !== angle) {
      this.origAngle = this.baseRotation = angle
    }
  }

  setAngle(deg) {
    if (deg === this.angle) return // no change in rotation

    // override, we want to rotate buildingSprite, not the container
    this.angle = deg
    this.buildingSprite.rotation = this.getRadAngle()

    // if (this.isEquipDisplay) {
    //   const position = this.game.app.renderer.plugins.interaction.mouse.global
    //   this.renderAtMousePosition(position.x, position.y)
    // }
  }

  setLocaleContents(localeContents) {
    this.localeContents = localeContents
  }

  renderEntityMenu(entityMenu) {
    this.showLighting(this.container, entityMenu)
    this.showStats(entityMenu)
    this.showAction(entityMenu)
    this.showLogs(entityMenu)
    this.showTargets(entityMenu)
    this.showPermissions(entityMenu)
  }

  hasTargets() {
    return this.hasCategory("editable_targets")
  }

  hasPermissions() {
    return this.hasCategory("editable_permissions")
  }

  getName() {
    return this.getTypeName() + " " + this.id
  }

  showTargets(entityMenu) {
    if (!this.hasTargets()) return

    let targetNames = Object.keys(Protocol.definition().AttackTargetType)
    for (let i = 0; i < targetNames.length; i++) {
      let targetName = targetNames[i]
      let targetId = Protocol.definition().AttackTargetType[targetName]
      let bitValue = (this.targets >> targetId) % 2
      let isEnabled = bitValue === 1
      let checkbox = entityMenu.querySelector(`.attack_target[data-target-id='${targetId}'] input`)

      if (isEnabled) {
        checkbox.checked = true
      } else {
        checkbox.checked = false
      }
    }
  }

  shouldShowCustomAccessSelect() {
    return true
  }

  showPermissions(entityMenu) {
    if (!this.hasPermissions()) return

    if (this.isCustomAccess) {
      entityMenu.querySelector(".entity_permission_roles").style.display = 'block'
      entityMenu.querySelector(".custom_access_select").value = 'custom'
    } else {
      entityMenu.querySelector(".entity_permission_roles").style.display = 'none'
      entityMenu.querySelector(".custom_access_select").value = 'default'
    }

    if (this.shouldShowCustomAccessSelect()) {
      entityMenu.querySelector(".custom_access_select").style.display = 'block'
    } else {
      entityMenu.querySelector(".custom_access_select").style.display = 'none'
    }


    // slave role
    let slaveRoleId = 3
    this.renderPermissionCheckbox(entityMenu, slaveRoleId)

    for (let id in this.game.roles) {
      let role = this.game.roles[id]
      this.renderPermissionCheckbox(entityMenu, role.id)
    }
  }

  renderPermissionCheckbox(entityMenu, roleId) {
    let bitValue = (this.accessType >> roleId) % 2
    let isEnabled = bitValue === 1
    let checkbox = entityMenu.querySelector(`.permission_role[data-role-id='${roleId}'] input`)
    if (!checkbox) return

    if (isEnabled) {
      checkbox.checked = true
    } else {
      checkbox.checked = false
    }
  }


  showLogs(entityMenu) {
    entityMenu.querySelector(".entity_logs").innerHTML = ""
  }

  showAction(entityMenu) {
    let html = this.getActions()
    if (html) {
      entityMenu.querySelector(".entity_action").innerHTML = html
    }
  }

  getActions() {
    let buttons = this.sector.getButtonsFor(this.getTypeNameCamelCase())
    let html = ""

    buttons.forEach((button) => {
      html += button.buildHTML(this)
    })

    return html
  }

  initPermissionSelectListener(entityMenu) {
    entityMenu.querySelector(".allow_access_select").addEventListener("change", this.onAllowAccessSelectChanged.bind(this))
  }

  onAllowAccessSelectChanged(e) {
    e.preventDefault()
    let value = e.target.value
    SocketUtil.emit("EditBuilding", { id: this.id, accessType: value })
  }

  setAllowAccessSelectDefault(entityMenu) {
    if (typeof this.accessType !== 'undefined') {
      entityMenu.querySelector(".allow_access_select").value = this.accessType
    } else {
      entityMenu.querySelector(".allow_access_select").value = -1
    }
  }

  showStats(entityMenu) {
    entityMenu.querySelector(".entity_stats").innerHTML = this.getEntityMenuStats()
  }

  getEntityMenuStats() {
    let el = ""

    if (this.decayStartTimestamp) {
      let decayEndTimestamp = this.decayStartTimestamp + Constants.physicsTimeStep * Constants.decayThresholdInSeconds
      let seconds = (decayEndTimestamp - game.timestamp) / Constants.physicsTimeStep
      let minute = Math.ceil(seconds / 60)
      if (minute < 0) minute = 0
      el += "<div class='entity_decay_timer'>Decay in " + minute + " min</div>"
    }

    if (!this.dontShowHealth()) {
      el += this.getHealthStat()
    }

    el += this.getOwnershipStat({ showMissingOwnership: true })

    let resources = ["power", "oxygen", "liquid", "fuel"]
    let types = ["consumer", "producer", "storage"]

    let primaryResource = this.getPrimaryResource()
    if (primaryResource) {
      resources = [primaryResource]
    }

    resources.forEach((resource) => {
      types.forEach((type) => {
        let category = [resource, type].join("_")
        if (this.hasCategory(category)) {
          el += this.getResourceStat(resource, type)
        }
      })

    })


    if (this.hasCategory("editable_permissions")) {
      let canManagePermissions = this.belongToOwner(this.game.player) &&
                                 this.game.player.isAdmin()

      if (!canManagePermissions) {
        el += this.getPermissionStat()
      }
    }

    if (this.hasCategory("spawnpoint") && this.content) {
      let canManageSpawn = this.belongToOwner(this.game.player) && this.game.player.isAdmin()
      if (!canManageSpawn) {
        el += this.getSpawnPointStat()
      }
    }


    return el
  }

  getPrimaryResource() {
    return this.getConstants().primaryResource
  }

  getUnitForResource(resource) {
    if (resource === "power") {
      return "W"
    } else if (resource === "oxygen") {
      return "%"
    } else if (resource === "liquid") {
      return "L"
    } else if (resource === "fuel") {
      return "L"
    }
  }

  getResourceStat(resource, type) {
    let el = ""
    let unit = this.getUnitForResource(resource)

    if (type === "producer") {
      el += this.getProducerStat(resource, unit)
    }

    if (type === "consumer") {
      el += this.getConsumerStat(resource, unit)
    }

    if (type === "storage") {
      el += this.getStorageStat(resource, unit)
    }

    return el
  }

  getFillBarMaxWidth() {
    return 36
  }

  redrawEntityUsage() {
    let shouldRedraw = this.hasCategory("power_storage") ||
                       this.hasCategory("oxygen_storage") ||
                       this.hasCategory("fuel_storage") ||
                       this.hasCategory("liquid_storage")

    if (shouldRedraw) {
      const usageRate = this.getUsage() / this.getUsageCapacity()

      if (this.hasFillBar()) {
        this.fillBar.height = usageRate * this.getFillBarMaxWidth()
      }

      if (this.game.entityMenu.isOpen(this)) {
        this.game.entityMenu.update(this)
      }
    }
  }

  hasFillBar() {
    return this.getConstants().hasFillBar
  }

  getResourceStored(name) {
    return this.usage
  }

  canMenuBeOpened() {
    return this.isConstructionFinished()
  }

  getStorageStat(name, unit = "") {
    let capacity = this.getResourceCapacity(name)
    let usage = this.usage

    if (!usage) return ""

    const el = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>" + i18n.t('Stored') + ":</div>" +
                      "<div class='stats_value'>" + usage + "/" + capacity + " " + unit + "</div>" +
                  "</div>"
    return el
  }

  getConsumerStat(name, unit = "") {
    if (name !== "power") return ""

    let consumption = this.getResourceConsumption(name)

    let resourceNeedLabel  = Helper.capitalize(name) + " Needed"

    const el = "<div class='entity_stats_entry'>" +
                  "<div class='stats_type'>" + i18n.t(resourceNeedLabel)  + ": </div>" +
                  "<div class='stats_value'>" + consumption + " " + unit + "</div>" +
              "</div>"

    return el
  }

  getHealthStat() {
    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>" + i18n.t('Entity.Health') + ":</div>" +
                    "<div class='stats_value'>" + this.health + "/" + this.getMaxHealth() + "</div>" +
                "</div>"
    return el
  }

  getPositionStat() {
    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>Row, Col:</div>" +
                    "<div class='stats_value'>(" + [this.getRow(), this.getCol()].join(",") + ")</div>" +
                "</div>"
    return el
  }

  getProducerStat(name, unit = "") {
    if (name === "oxygen") return ""

    let production = this.getResourceProduction(name)

    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>" + i18n.t('Production') + ":</div>" +
                    "<div class='stats_value'>" + production + " " + unit + "</div>" +
                "</div>"

    return el
  }

  setContent(content) {
    if (this.content !== content) {
      this.content = content
      this.onContentChanged()
    }
  }

  getGold() {
    return this.content || 0
  }

  onContentChanged() {

  }

  getSelectionWidth() {
    return this.getRotatedWidth()
  }

  getSelectionHeight() {
    return this.getRotatedHeight()
  }

  getRotatedWidth() {
    return Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * this.getWidth() + Math.abs(Math.sin(this.getRadOrigAngle())) * this.getHeight())
  }

  getRadOrigAngle() {
    return this.origAngle * (Math.PI / 180)
  }

  getRotatedHeight() {
    return Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * this.getHeight() + Math.abs(Math.sin(this.getRadOrigAngle())) * this.getWidth())
  }

  /*
    1x1,1x2,2x1
  */
  createInProgressBorderSprite() {
    let graphics = new PIXI.Graphics()
    graphics.name = "building_in_progress_border"

    const lineStyle = {
      lineWidth: 4,
      color: 0xeeeeee,
      alpha: 0.7
    }

    padding = 2

    graphics.lineStyle(lineStyle.lineWidth, lineStyle.color)
    graphics.drawRect(-this.getRotatedWidth()/2 + padding, -this.getRotatedHeight()/2 + padding, this.getRotatedWidth() - (padding * 2), this.getRotatedHeight() - (padding * 2))
    graphics.endFill()
  }

  getSprite() {
    const sprite = new PIXI.Container()
    sprite.name = this.constructor.name

    // building sprite
    this.buildingSprite = this.getBuildingSprite()
    this.buildingSprite.name = "Building"

    if (this.hasFillBar()) {
      this.buildingSprite.addChild(this.createFillBar())
    }

    sprite.addChild(this.buildingSprite)

    return sprite
  }

  createFillBar() {
    this.fillBarContainer = new PIXI.Sprite(PIXI.utils.TextureCache["gas_fill_bar_container.png"])
    this.fillBarContainer.name = "FillBarContainer"
    this.fillBarContainer.anchor.set(0.5)
    this.fillBarContainer.position.x = -36
    this.fillBarContainer.height = 32

    this.fillBar = new PIXI.Sprite(PIXI.utils.TextureCache["gas_fill_bar.png"])
    this.fillBar.name = "FillBar"
    this.fillBar.anchor.x = 0.5
    this.fillBar.anchor.y = 0
    this.fillBar.width = 6
    this.fillBar.height = 0
    this.fillBar.position.y = -18

    this.fillBarContainer.addChild(this.fillBar)

    return this.fillBarContainer
  }

  getSpriteContainer() {
    const isOnCeiling = this.getConstants().isOnCeiling
    let group = isOnCeiling ? "ceilings" : this.getSpriteLayerGroup()

    if (this.isEquipment()) {
      return this.data.user.handEquipContainer
    } else if (this.data.isEquipDisplay) {
      return this.container.spriteLayers[group]
    } else {
      return this.container.getSpriteLayerForChunk(group, this.getChunkRow(), this.getChunkCol())
    }
  }

  isChunkable() {
    if (this.data.isEquipDisplay) return false

    if (this.getContainer().isMovable()) return false

    let chunkableGroups = ["platforms", "distributions", "armors"]
    return !this.isEquipment() && chunkableGroups.indexOf(this.getGroup()) !== -1
  }

  updateChunkSprite() {
    if (!this.isChunkable()) return

    this.getChunk().updateSprite(this)
  }

  getGroup() {
    return "structures"
  }

  getSpriteLayerGroup() {
    return this.getGroup()
  }

  onPositionChanged() {

  }

  onGridPositionChanged() {
    this.renderInvalidArea()
  }

  getRelativeBox() {
    if (!this.container.isMovable()) {
      return this.getBox(this.getX(), this.getY(), this.getRotatedWidth(), this.getRotatedHeight())
    } else {
      return this.getBox(this.getRelativeX(), this.getRelativeY(), this.getRotatedWidth(), this.getRotatedHeight())
    }
  }

  isAirtight() {
    return false
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

  getPaddedBox() {
    const box = this.getBox()

    box.pos.x -= Constants.tileSize
    box.pos.y -= Constants.tileSize
    box.w += (Constants.tileSize * 2)
    box.h += (Constants.tileSize * 2)

    return box
  }

  calculateInvalidBox(tileCollisionMap) {
    let lowerBound = { row: null, col: null }
    let upperBound = { row: null, col: null }

    let containsInvalid = false

    for (let mapType in tileCollisionMap) {
      let collisionTiles = tileCollisionMap[mapType]

      collidedTiles.forEach((hit) => {
        if (hit.entity !== 0) {
          containsInvalid = true

          lowerBound.row = lowerBound.row !== null ? Math.min(lowerBound.row, hit.row) : hit.row // must use null comparison instead of 0, because 0 will be interpreted as falsy
          lowerBound.col = lowerBound.col !== null ? Math.min(lowerBound.col, hit.col) : hit.col

          upperBound.row = upperBound.row !== null ? Math.max(upperBound.row, hit.row) : hit.row
          upperBound.col = upperBound.col !== null ? Math.max(upperBound.col, hit.col) : hit.col
        }
      })
    }


    return {
      lowerBound: lowerBound,
      upperBound: upperBound
    }
  }

  onBuildStart() {
    if (this.hasDistributionRole()) {
      this.game.sector.spriteLayers["armors"].alpha = 0.5
      this.game.sector.spriteLayers["structures"].alpha = 0.5
    }
  }

  onBuildStop() {
    if (this.hasDistributionRole()) {
      this.game.sector.spriteLayers["armors"].alpha = 1
      this.game.sector.spriteLayers["structures"].alpha = 1
    }
  }

  animateWalk(entity) {

  }

  getBuildingSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = this.createSprite(texture)
    sprite.name = [this.constructor.name, "building"].join("_")

    sprite.anchor.set(0.5)
    sprite.scale.y = this.getYScale()
    sprite.scale.x = this.getXScale()

    if (!this.shouldUseOriginalWidth()) {
      sprite.width = this.getDisplayWidth()
      sprite.height = this.getDisplayHeight()
    }

    return sprite
  }

  getRotatedAngle() {
    return this.container.getRadAngle() + this.getRadAngle()
  }

  setAttribute(attribute) {

  }

  setResourceStorages(resourceStorages) {
    for (let resource in resourceStorages) {
      let resourceStorage = resourceStorages[resource]
      let clientResource = this.getStats().clientResource

      // building could have multiple resource usages (i.e liquid + oxygen)
      // only setUsage for the clientResource
      if (clientResource === resource) {
        this.setUsage(resourceStorage.usage)
      }
    }
  }

  setColorIndex(colorIndex) {
    this.colorIndex = colorIndex
  }

  setTextureIndex(textureIndex) {
    this.textureIndex = textureIndex
  }

  setIsHarvestable(isHarvestable) {

  }

  setIsPowered(powerStatus) {
    this.setPowerStatus(powerStatus)
  }

  setIsProcessing(isProcessing) {
    if (this.isProcessing !== isProcessing) {
      this.isProcessing = isProcessing
      this.onIsProcessingChanged()
    }
  }

  setAccessType(accessType) {
    if (this.accessType !== accessType) {
      this.accessType = accessType
      this.onAccessTypeChanged()
    }
  }

  setIsCustomAccess(isCustomAccess) {
    if (this.isCustomAccess !== isCustomAccess) {
      this.isCustomAccess = isCustomAccess
      this.onIsCustomAccessChanged()
    }
  }

  onIsCustomAccessChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  onAccessTypeChanged() {
    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  getPermissionStat(accessType) {
    let allowedRoles = []

    if (this.isRoleAllowed(3)) {
      allowedRoles.push(i18n.t("Slave"))
    }

    for (let id in this.game.roles) {
      let role = this.game.roles[id]
      if (this.isRoleAllowed(role.id)) {
        allowedRoles.push(i18n.t(role.name))
      }
    }

    let roles = this.isCustomAccess ? allowedRoles.join(", ") : "Default"

    let el = "<div class='entity_stats_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Permission') + ":</div>" +
                  "<div class='stats_value access_role_stats_value'>" + roles + "</div>" +
              "</div>"
    return el
  }

  getSpawnPointStat() {
    let label = ""
    let group = "For"

    if (this.content === 'everyone') {
      label = "Everyone"
    } else {
      group = this.content.split("-")[0]
      let value = this.content.split("-")[1]
      if (group === 'role') {
        let role = this.game.roles[value]
        if (role) {
          label = role.name
        }
      } else if (group === 'team') {
        let team = this.game.teams[value]
        if (team) {
          label = team.name
        }
      }
    }

    let el = "<div class='entity_stats_entry'>" +
                  "<div class='stats_type'>" + i18n.t(Helper.capitalize(group)) + ":</div>" +
                  "<div class='stats_value spawn_point_filter_stats_value'>" + label + "</div>" +
              "</div>"
    return el
  }

  isRoleAllowed(roleId) {
    let bitValue = (this.accessType >> roleId) % 2
    let isEnabled = bitValue === 1
    return isEnabled
  }

  onIsProcessingChanged() {

  }

  setIsWatered(isWatered) {
    if (this.isWatered !== isWatered) {
      this.isWatered = isWatered
      this.onIsWateredChanged()
    }
  }

  setBuildProgress(buildProgress) {
    if (this.buildProgress !== buildProgress) {
      this.buildProgress = buildProgress
      this.onBuildProgressChanged()
    }
  }

  getMaxBuildProgress() {
    return 100
  }

  onBuildProgressChanged() {
    let percentProgress = this.buildProgress / this.getMaxBuildProgress()
    if (this.isConstructionFinished()) {
      this.buildingSprite.alpha = 1

      if (this.progressBar) {
        this.progressBar.remove()
        this.progressBar = null
      }

      this.updateChunkSprite()
    } else if (this.buildProgress > 0) {
      this.buildingSprite.alpha = 0.3 + (0.7 * percentProgress)

      this.initProgressBar()
      this.progressBar.draw()
    } else if (this.buildProgress === 0) {
      this.buildingSprite.alpha = 0.3
    }
  }

  isConstructionInProgress() {
    return !this.isConstructionFinished()
  }

  isConstructionFinished() {
    if (this.buildProgress === null || typeof this.buildProgress === 'undefined') {
      return true
    }

    return this.buildProgress >= this.getMaxBuildProgress()
  }

  initProgressBar() {
    if (this.progressBar) return

    this.progressBar = new ProgressBar(this, {
      attribute: "buildProgress",
      maxAttribute: "getMaxBuildProgress",
      isFixedPosition: true
    })
  }

  removeProgressBar() {
    if (this.progressBar) {
      this.progressBar.remove()
    }
  }


  onIsWateredChanged() {

  }

  syncWithServer(data) {
    for (let attribute in data) {
      let value = data[attribute]
      if (Helper.isProtobufAttributeSet(data, attribute)) {
        let handler = this[attributeHandlers[attribute]]
        if (handler) {
          handler.call(this, data[attribute])
        }
      }
    }

  }

  setOwner(owner) {
    this.owner = owner
  }

  setUnowned(unowned) {
    this.unowned = unowned
  }

  setNeighbors(neighbors) {
    if (this.neighbors !== neighbors) {
      this.neighbors = neighbors
      this.onNeighborChanged()
    }
  }

  setName(name) {
    this.name = name
    this.onNameChanged()
  }

  onNameChanged() {
    this.createNameSpriteIfNotPresent()
    this.nameText.sprite.text = this.name
  }

  createNameSpriteIfNotPresent() {
    if (!this.nameSprite) {
      const margin = this.getRotatedHeight() - this.getRotatedHeight()/4

      this.nameSprite = new PIXI.Container()
      this.nameSprite.position.x = this.getX() 
      this.nameSprite.position.y = this.getY() + margin
      this.nameSprite.name = "NameContainer"

      this.nameText = BitmapText.create({ 
        label: "NameText",
        text: this.name, 
        align: 'center',
        spriteContainer: this.nameSprite
      })

      this.sector.effectsContainer.addChild(this.nameSprite)
    }
  }

  onNeighborChanged() {
    this.redrawSprite()
  }

  isOwnedBy(player) {
    if (!this.owner) return false
    return this.owner.id === player.getBuildOwnerId()
  }

  setPowerNetwork(network) {
    this.removeAndReplaceNetwork("power", network)
  }

  setFuelNetwork(network) {
    this.removeAndReplaceNetwork("fuel", network)
  }

  setOxygenNetwork(network) {
    this.removeAndReplaceNetwork("fuel", network)
  }

  setLiquidNetwork(network) {
    this.removeAndReplaceNetwork("fuel", network)
  }

  setRailNetwork(network) {
    this.removeAndReplaceNetwork("rail", network)
  }

  setSoilNetwork(network) {
    this.removeAndReplaceNetwork("soil", network)
  }

  removeAndReplaceNetwork(type, network) {
    this.removeNetwork(type)

    if (network.id !== 0) {
      this.setNetwork(type, network.id)
    }
  }

  removeNetworks() {
    Object.keys(this.networks).forEach((networkType) => {
      this.removeNetwork(networkType)
    })
  }

  setNetwork(type, id) {
    let prevNetwork = this.networks[type]
    this.networks[type] = id

    if (prevNetwork !== this.networks[type]) {
      this.onNetworkChanged(type, id)
    }
  }

  isBuildingType() {
    return true
  }

  isItemStorage() {
    return this.getStorageCount() > 1
  }

  removeNetwork(type) {
    delete this.networks[type]

    if (this.networkSprites[type]) {
      this.networkSprites[type].remove()
    }

    delete this.networkSprites[type]
  }

  onNetworkChanged(type, id) {
    this.updateNetworkSprite(type, id)
  }

  updateNetworkSprite(type, id) {
    return
    if (this.networkSprites[type]) {
      this.networkSprites[type].remove()
    }

    this.networkSprites[type] = new NetworkSprite(this.game, {
      container: this.container,
      type: type,
      id: id,
      x: this.getX(),
      y: this.getY()
    })
  }

  showPowerOff() {
    this.powerOffSprite = new PIXI.Sprite(PIXI.utils.TextureCache["power_off.png"])
    this.powerOffSprite.anchor.set(0.5)
    this.powerOffSprite.width  = Constants.tileSize * 3/4
    this.powerOffSprite.height = Constants.tileSize * 3/4

    this.buildingSprite.addChild(this.powerOffSprite)

    this.powerTween = this.getPowerTween()
    this.powerTween.start()
  }

  getSpawnTween() {
    let alpha = { alpha: 0.4 }

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 500)
        .onUpdate(() => {
          this.buildingSprite.alpha = alpha.alpha
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

  getPowerTween() {
    let alpha = { alpha: 1 }

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0.3 }, 500)
        .onUpdate(() => {
          this.powerOffSprite.alpha = alpha.alpha
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

  removePowerOff() {
    if (this.powerOffSprite) {
      if (this.powerOffSprite.parent) {
        this.powerOffSprite.parent.removeChild(this.powerOffSprite)
      }
      this.powerTween.stop()
    }
  }

  setIsLaunched(isLaunched) {
    if (this.isLaunched !== isLaunched) {
      this.isLaunched = isLaunched
      this.onLaunchedChanged()
    }
  }

  setIsUnderConstruction(isUnderConstruction) {
    if (this.isUnderConstruction !== isUnderConstruction) {
      this.isUnderConstruction = isUnderConstruction
      this.onIsUnderConstructionChanged()
    }
  }

  setDecayStartTimestamp(decayStartTimestamp) {
    this.decayStartTimestamp = decayStartTimestamp
    this.onDecayStartTimestampChanged()
  }

  onDecayStartTimestampChanged() {
  }

  onIsUnderConstructionChanged() {
    if (!this.isUnderConstruction) {
      this.setBuildProgress(100)
    }
  }

  onLaunchedChanged() {

  }

  setLevel(level) {
    const prevLevel = this.level

    this.level = level

    if (this.level !== prevLevel && this.level !== 0) {
      this.onLevelIncreased()
    }
  }

  onLevelIncreased() {
    if (this.game.isEntityMenuOpenFor(this)) {
      this.game.showEntityMenu(this)
    }
  }

  getXYPosition() {
    return {
      x: this.getX(),
      y: this.getY()
    }
  }

  getCollisionGroup() {
    return "collisionGroup.Building"
  }

  getType() {
    throw new Error("must implement BaseBuilding.getType")
  }

  getGroupType() {
    return "building"
  }

  toJson() {
    return {
      type: this.getType(),
      x: this.getX(),
      y: this.getY()
    }
  }

  getDamage() {
    return 0
  }

  getRange() {
    return 0
  }

  static isOnHangar(container, x, y, w, h) {
    const hits = container.platformMap.hitTestTile(this.getBox(x, y, w, h))
    return hits.find((hit) => { return hit.entity && hit.entity.isHangar() })
  }

  static hasRailNeighbor(container, x, y, w, h) {
    let paddedBox = this.getPaddedRelativeBox(this.getBox(x,y,w,h))
    return container.railMap.hitTestTile(paddedBox).find((hit) => {
      return hit.entity
    })
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.getBox(x, y, w, h))
    const hasSoil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !this.hasRailNeighbor(container, x, y, w, h) &&
           !hasSoil &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.unitMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  static isWithinInteractDistance(x, y, player) {
    let distance = Helper.distance(player.getX(), player.getY(), x, y)
    return distance <= Helper.ENTITY_INTERACT_RANGE
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

  postBuildingConstructed() {
    this.assignStructureOnMap()
  }

  assignStructureOnMap() {
    this.game.mapMenu.assignStructure(this)
  }

  getMinimapColor() {
    return this.getConstants().minimapColor
  }

  onBuildingConstructed() {
    this.register()

  }

  hasOwner() {
    return !!this.owner
  }

  hasRailOnTop() {
    let row = this.getRow()
    let col = this.getCol()
    return this.container.railMap.get(row, col)
  }

  hasStructureOnTop() {
    let row = this.getRow()
    let col = this.getCol()
    return this.container.structureMap.get(row, col)
  }

  hasWallOnTop() {
    let row = this.getRow()
    let col = this.getCol()
    return this.container.armorMap.get(row, col)
  }

  assignLighting() {
    if (this.hasCategory("platform")) {
      this.assignShadow()
    } else if (this.isLightBlocker()) {
      this.container.lightManager.invalidateLightSources(this.getRow(), this.getCol())
    } else if (this.isLightSource() && this.isLightOn()) {
      this.container.lightManager.queueLightSource({ action: 'register', entity: this })
    }
  }

  assignShadow() {
    this.container.lightManager.assignShadowFor(this, this.getShadowColor())
  }

  getLightColor() {
    return this.getConstants().lightColor
  }

  getLightRadius() {
    return this.getConstants().lightRadius
  }

  unassignLighting() {
    if (this.hasCategory("platform") ) {
      this.unassignShadow()
    } else if (this.isLightBlocker()) {
      this.container.lightManager.invalidateLightSources(this.getRow(), this.getCol())
    } else if (this.isLightSource()) {
      this.container.lightManager.queueLightSource({ action: 'unregister', entity: this })
    }
  }

  unassignShadow() {
    this.container.lightManager.unassignShadowFor(this, this.getGroundShadowColor())
  }

  getShadowColor() {
    return "#292929"
  }

  getGroundShadowColor() {
    let platform = this.getStandingPlatform()
    if (platform) {
      return platform.getShadowColor()
    } else {
      return "#ffffff"
    }
  }

  getBrightness() {
    return 0
  }

  getTopLeftRow() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.y) / Constants.tileSize)
  }

  getTopLeftCol() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.x) / Constants.tileSize)
  }

  static getNeighborTiles(tilemap, relativeBox) {
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

  static isSameHit(hit, otherHit) {
    return hit.row === otherHit.row && hit.col === otherHit.col
  }

  static getSideTiles(tilemap, relativeBox) {
    const paddedRelativeBox = this.getPaddedRelativeBox(relativeBox)
    let checkFull = false
    let excludeOutOfBounds = false

    let   coreHits = tilemap.hitTestTile(relativeBox, checkFull, excludeOutOfBounds)
    let   paddedHits = tilemap.hitTestTile(paddedRelativeBox, checkFull, excludeOutOfBounds)
    const coreEdges = tilemap.getDiagonalEdges(paddedRelativeBox, checkFull, excludeOutOfBounds)

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

  getSideHitTileMaps() {
    let tileMaps = [this.getMap()]

    if (this.hasPowerRole())  tileMaps.push(this.container.distributionMap)
    if (this.hasLiquidRole()) tileMaps.push(this.container.liquidDistributionMap)
    if (this.hasOxygenRole()) tileMaps.push(this.container.gasDistributionMap)
    if (this.hasFuelRole())   tileMaps.push(this.container.fuelDistributionMap)

    return tileMaps
  }

  getSideHits() {
    let tileMaps = this.getSideHitTileMaps()
    if (tileMaps.length === 1) {
      return this.getSideHitsFor(tileMaps[0])
    } else {
      return this.getSideHitsMulti(tileMaps)
    }
  }

  getSideHitsMulti(tileMaps) {
    let firstSideHits    = this.getSideHitsFor(tileMaps[0])
    let secondSideHits   = this.getSideHitsFor(tileMaps[1])
    let hits = {}

    for (let direction in firstSideHits) {
      let directionHits = firstSideHits[direction]
      let hit = directionHits[0] // it'll only have one entry only
      if (!hit) continue

      let firstHitDetected = hit.entity
      if (firstHitDetected) {
        hits[direction] = firstSideHits[direction]
      } else {
        hits[direction] = secondSideHits[direction]
      }
    }

    return hits
  }

  onEffectAdded(effect) {
    super.onEffectAdded(effect)
    this.updateChunkSprite()
  }

  onEffectRemoved(effect) {
    super.onEffectRemoved(effect)
    this.updateChunkSprite()
  }

  onEffectLevelChanged(effect, level) {
    super.onEffectLevelChanged(effect, level)
    this.updateChunkSprite()
  }

  getRowColSideHitsFor(tilemap, row, col) {
    return {
      left:  tilemap.rowColHitTest(row    , col - 1), // left
      up:    tilemap.rowColHitTest(row - 1, col    ), // top
      right: tilemap.rowColHitTest(row    , col + 1), // right
      down:  tilemap.rowColHitTest(row + 1, col    ), // down
    }
  }

  getCoreHits() {
    return this.getMap().hitTestTile(this.getRelativeBox())
  }

  getSideHitsFor(tilemap) {
    const result = { left: [], up: [], right: [], down: [] }

    let   coreHits = tilemap.hitTestTile(this.getRelativeBox())
    const sideTiles = this.getSideTiles(tilemap)

    for (var i = 0; i < sideTiles.length; i++) {
      let hit = sideTiles[i]
      if (tilemap.isLeft(hit, coreHits)) {
        result["left"].push(hit)
      } else if (tilemap.isUp(hit, coreHits)) {
        result["up"].push(hit)
      } else if (tilemap.isRight(hit, coreHits)) {
        result["right"].push(hit)
      } else if (tilemap.isDown(hit, coreHits)) {
        result["down"].push(hit)
      }

    }

    return result
  }

  removeStructureFromMinimap() {
    // to prevent cases where other platforms has already this current one thats being deleted
    // and erasing the minimap rendering of that platform
    // let isRegisteredOnMap = this.getMap().get(this.getRow(), this.getCol()) === this
    // if (isRegisteredOnMap) {
    //   this.game.mapMenu.removeStructure(this)
    // }

    let shouldIgnoreDynamic = true
    let entity = this.sector.pick(this.getRow(), this.getCol(), null, shouldIgnoreDynamic)
    if (entity && entity.isBuildingType()) {
    } else {
      this.game.mapMenu.unassignStructure(this)
    }
  }

  getUpgradeCost() {
    return 0
  }

  remove() {
    super.remove()

    this.removeNetworks()
    this.removeProgressBar()

    this.updateChunkSprite()

    if (this.nameText) {
      this.nameText.remove()
    }

    if (this.nameSprite) {
      this.nameSprite.parent.removeChild(this.nameSprite)
    }

    if (!this.isEquipDisplay && !this.isEquipment()) {
      this.getContainer().unregisterEntity("buildings", this)
      this.getChunk().unregister("buildings", this)
      this.unregister()
      this.unassignLighting()

      this.removeStructureFromMinimap()
    }

    this.cleanupTween()

    if (this.game.sector.persistentSelection.selectedEntity === this) {
      this.game.resetEntitySelection()
    }
  }

  cleanupTween() {
    if (this.fireTween) {
      this.fireTween.stop()
    }

    if (this.powerTween) {
      this.powerTween.stop()
    }
  }

  redrawSprite() {
    this.updateChunkSprite()
  }

  convertNeighborsToSideHits() {
    let neighbors = this.neighbors
    return {
      "left":  !!((neighbors >> 3) & 1),
      "up":    !!((neighbors >> 2) & 1),
      "right": !!((neighbors >> 1) & 1),
      "down":  !!((neighbors >> 0) & 1)
    }
  }

  getMap() {
    return this.container.structureMap
  }

  getMapRegisterBox() {
    return this.getRelativeBox()
  }

  register() {
    this.container[this.getGroup()][this.id] = this
    this.getMap().register(this.getMapRegisterBox(), this)
  }

  unregister() {
    this.getContainer().unregisterEntity(this.getGroup(), this)
    this.getMap().unregister(this.getMapRegisterBox(), this)
  }

  getX() {
    if (this.container.isMovable()) {
      return this.getAbsoluteXOnContainer()
    }

    return super.getX()
  }

  getContainer() {
    return this.container
  }

  getY() {
    if (this.container.isMovable()) {
      return this.getAbsoluteYOnContainer()
    }

    return super.getY()
  }

  forceShowDamage() {
    return false
  }

  getRow() {
    return Math.floor(this.getRelativeY() / Constants.tileSize)
  }

  getCol() {
    return Math.floor(this.getRelativeX() / Constants.tileSize)
  }

}

Object.assign(BaseBuilding.prototype, Upgradable.prototype, {
})

Object.assign(BaseBuilding.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.sprite.position.x
  },
  getRelativeY() {
    return this.sprite.position.y
  }
})

/* Implement Destroyable */

Object.assign(BaseBuilding.prototype, Destroyable.prototype, {
  onHealthZero() {
    this.animateDestruction()
  },
  getMaxHealth() {
    if (this.game.sector.entityCustomStats[this.id]) {
      return this.game.sector.entityCustomStats[this.id].health
    }

    if (this.game.sector.buildingCustomStats[this.getType()]) {
      return this.game.sector.buildingCustomStats[this.getType()].health
    }

    return this.getStats(this.level).health
  },
  onPostSetHealth() {
    if (!this.dontShowHealth()) {
      HealthBar.draw(this, { isFixedPosition: true })
    }


    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }

  },
  onHealthReduced(delta) {
    if (this.forceShowDamage()) {
      HealthBar.draw(this, { isFixedPosition: true })
    }

    if (!this.dontShowHealth() || this.forceShowDamage()) {
      HealthBar.showDamageTaken(this, delta)
      this.animateDamage()
    }
  }
})

Object.assign(BaseBuilding.prototype, BaseBuildingCommon.prototype, {
})

Object.assign(BaseBuilding.prototype, Resource.prototype, {
})

Object.assign(BaseBuilding.prototype, Powerable.prototype, {
  onPowerChanged() {
    if (this.isPowered) {
      this.removePowerOff()
    } else {
      this.showPowerOff()
    }
  }
})

Object.assign(BaseBuilding.prototype, Drainable.prototype, {
  getUsageCapacity() {
    let clientResource = this.getStats().clientResource
    if (clientResource) {
      return this.getResourceCapacity(clientResource)
    } else {
      return 100
    }
  },
  onUsageChanged() {
    let clientResource = this.getStats().clientResource
    if (clientResource) {
      this.redrawEntityUsage()
    }
  }
})

Object.assign(BaseBuilding.prototype, Conductor.prototype, {
  getConduitMap() {
    if (this.hasPowerRole()) {
      return this.container.distributionMap
    }

    if (this.hasLiquidRole()) {
      return this.container.liquidDistributionMap
    }

    if (this.hasOxygenRole()) {
      return this.container.gasDistributionMap
    }

    if (this.hasFuelRole()) {
      return this.container.fuelDistributionMap
    }
  },
  canConduct(hit) {
    if (!hit.entity) return false

    if (this.hasPowerRole()) {
      return hit.entity.hasCategory("power_conduit")
    }

    if (this.hasLiquidRole()) {
      return hit.entity.hasCategory("liquid_conduit")
    }

    if (this.hasOxygenRole()) {
      return hit.entity.hasCategory("oxygen_conduit")
    }

    if (this.hasFuelRole()) {
      return hit.entity.hasCategory("fuel_conduit")
    }
  },
  getTextures() {
    if (this.hasPowerRole()) {
      return this.sector.getConduitTexturesForRole("power")
    }

    if (this.hasLiquidRole()) {
      return this.sector.getConduitTexturesForRole("liquid")
    }

    if (this.hasOxygenRole()) {
      return this.sector.getConduitTexturesForRole("oxygen")
    }

    if (this.hasFuelRole()) {
      return this.sector.getConduitTexturesForRole("fuel")
    }
  },
  getTileSprite() {
    return this.buildingSprite
  }
})


module.exports = BaseBuilding
