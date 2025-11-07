const Grid = require("./../../../common/entities/grid")
const Constants = require("./../../../common/constants.json")
const Container = require("./../../../common/interfaces/container")
const ClientContainer = require("./client_container")
const Protocol = require("./../../../common/util/protocol")
const Helper = require("./../../../common/helper")
const Player = require("./player")
const Backgrounds = require("./backgrounds/index")
const ClientHelper = require("./../util/client_helper")
const StarmapLocation = require("./starmap_location")
const RoomAlertManager = require("./room_alert_manager")
const LightManager = require("./light_manager")
const Selection = require("./selection")
const Chunk = require("./chunk")
const HomeArea = require("./home_area")
const ExceptionReporter = require("./../util/exception_reporter")
const Buildings = require('./buildings/index')
const ObjectPool = require("../../../common/entities/object_pool")
const rbush = require("rbush")

const Wire = require("./buildings/wire")
const GasPipe = require("./buildings/gas_pipe")
const LiquidPipe = require("./buildings/liquid_pipe")
const FuelPipe = require("./buildings/fuel_pipe")

// mostly used as a sprite container
class Sector {
  constructor(game, data) {
    this.id  = data.id
    this.uid = data.uid
    this.name = data.name
    this.game = game
    this.createdAt = data.createdAt
    this.game.sector = this
    this.angle = 0
    this.tick = 0

    this.settings = {}
    this.buttons = {}

    this.sectorBans = data.sectorBans
    this.gameMode = data.gameMode
    this.rowCount = data.rowCount
    this.colCount = data.colCount
    this.buildSpeed = data.buildSpeed
    this.screenshots = data.screenshots
    this.sellables = data.sellables
    this.mobCustomStats = data.mobCustomStats || {}
    this.buildingCustomStats = data.buildingCustomStats || {}
    this.entityCustomStats = data.entityCustomStats || {}
    this.visitorHappiness = data.visitorHappiness || 0;
    this.unlockedItems = data.unlockedItems || [];
    this.itemCustomStats = data.itemCustomStats || {}
    
    for (let name in data.buttons) {
      let buttonData = data.buttons[name]
      this.game.onButtonUpdated({ button: buttonData })
    }

    for (let id in data.commandBlockTimers) {
      let timer = data.commandBlockTimers[id]
      this.game.addCommandBlockTimer(timer)
    }

    this.purchasables = data.purchasables
    this.isCustomSell = data.isCustomSell
    this.isPrivate = data.isPrivate
    this.cameraFeeds = data.cameraFeeds

    this.undergroundMap = new Grid("underground", this, this.getRowCount(), this.getColCount())
    this.groundMap = new Grid("ground", this, this.getRowCount(), this.getColCount())
    this.map = new Grid("foreground", this, this.getRowCount(), this.getColCount())
    this.corpseMap = new Grid("corpse", this, this.getRowCount(), this.getColCount())

    this.initGrids()
    this.initRoomAlertManager()
    this.initClientContainer()
    this.initProgressCircle()

    // will need to cleanup objects eventually
    this.starmapLocations = {}
    this.players = {}
    this.terminalMessages = []
    this.ships = {}
    this.originalColors = {}
    this.mobs = {}
    this.units = {}
    this.pickups = {}
    this.projectiles = {}
    this.backgrounds = []
    this.terrains = {}
    this.buildings = {}
    this.transports = {}
    this.plants = {}
    this.chunkRegions = {}
    this.chunkRegionPaths = {}
    this.entityToChunkRegionPaths = {}
    this.chunksToCache = {}
    this.originalPlayers = {}
    this.bars = {}
    this.regionTree = rbush()
    this.regionTree.name = 'regionTree'

    this.entities = {}
    this.hangars = {}

    this.movableGroupSet = new Set()
    this.movableGroups = ["transports", "ships", "corpses", "players", "mobs", "units", "projectiles", "pickups"]
    this.movableGroups.forEach((group) => {
      this.movableGroupSet.add(group)
    })

    this.backgroundGroups = ["backgrounds"]
    this.roomGroups    = ["rooms"]
    this.homeAreaGroups = ["home_areas"]
    this.tileGroups    = ["buildings"]
    this.clientDebugGroups = ["paths", "regions", "light_paths"]
    this.networkGroups = ["power", "oxygen", "liquid", "fuel", "rail", "soil"]

    // chunkable
    this.terrainGroups = ["undergrounds", "grounds", "foregrounds"]
    this.buildingGroups = ["platforms", "liquidDistributions", "gasDistributions", "fuelDistributions", "distributions"]
    this.wallGroups    = ["armors"]
    this.structureGroups = ["structures"]
    this.ceilingGroups = ["ceilings"]

    this.initLightManager()

    this.initSprite()
    this.initSelection()
    this.initChunks() // need to be loaded after initSprite
    this.renderBackgrounds()
    this.initRP(data)

    this.initHomeArea()
    this.game.teamMenu.renderScreenshots(this)
    this.game.mapMenu.resizeCanvas(this)

    if (this.isMiniGame() && this.isPrivate) {
      this.game.showMiniGameInviteLink()
    }

    if (this.isMiniGame()) {
      document.body.classList.add("minigame")
    } else {
      document.body.classList.remove("minigame")
    }

    this.initialLoadTime = Date.now()

  }

  initRP(data) {
    this.RPLevel = data.RP || 0;
    if(this.gameMode == 'peaceful') document.querySelector(".RP_stats").style.display = 'none'
  }

  setMobCustomStats(type, stats) {
    this.mobCustomStats[type] = stats
  }

  setBuildingCustomStats(type, stats) {
    this.buildingCustomStats[type] = stats
  }

  setItemCustomStats(type, stats) {
    this.itemCustomStats[type] = stats
  }

  setEntityCustomStats(id, stats) {
    this.entityCustomStats[id] = stats

    if (id === this.game.playerId) {
      this.game.updateHealthBar(this.game.player.health, this.game.player.getMaxHealth())
    }
  }

  setSettings(settings) {
    for (let key in settings) {
      let prevValue = this.settings[key]
      let value = settings[key]

      if (prevValue !== value) {
        this.settings[key] = value
        this.onSettingsChanged(key, value)
      }
    }
  }

  getRegionBuildPermission(x, y, w, h) {
    let padding = 1
    let boundingBox = {
      minX: x - w/2 + padding,
      minY: y - h/2 + padding,
      maxX: x + w/2 - padding,
      maxY: y + w/2 - padding
    }

    let regions = this.regionTree.search(boundingBox)
    if (regions.length === 0) return null

    let region

    if (regions.length > 1) {
      // highest priority
      region = regions.sort((a, b) => {
        let priorityA = parseInt(a.getFlag("priority") || 0)
        let priorityB = parseInt(b.getFlag("priority") || 0)
        return priorityB - priorityA
      })[0]
    } else {
      region = regions[0]
    }

    return region.getFlag("build")
  }


  addRegion(region) {
    this.regions[region.id] = region
  }

  removeRegion(region) {
    delete this.regions[region.id]
  }

  addButton(button) {
    this.buttons[button.id] = button
  }

  removeButton(button) {
    delete this.buttons[button.id]
  }

  getButtonsFor(klassName) {
    let result = []

    for (let id in this.buttons) {
      let button = this.buttons[id]
      if (button.isAttachedTo(klassName)) {
        result.push(button)
      }
    }

    return result
  }

  setIsPrivate(isPrivate) {
    this.isPrivate = isPrivate
  }

  getOriginalUid() {
    if (this.isMiniGame()) {
      return this.uid.split(/mini-(.*)-/)[1]
    }

    return this.uid
  }

  getTimerBombKlass() {
    return Buildings.NonBuidables.TimerBomb
  }

  onSettingsChanged(key, value) {
    if (key === "isZoomAllowed") {
      this.game.autoAdjustResolution()
    }
    
    if (key === "isFovMode") {
      if (this.isFovMode()) {
        this.applyFovMaskToLight()
        this.lightManager.applyFov()
      } else {
        this.lightManager.removeFov()
        this.removeFovMaskFromLight()
      }
      
      this.game.mapMenu.clearMapPositions()
      this.game.mapMenu.redrawEntityMap()
    }

    if (key === "showMiniMap") {
      if (this.shouldShowMiniMap()) {
        document.querySelector("#mini_map_menu").style.display = 'block'
        document.querySelector("#mini_map_player_pos_label").style.display = 'block'
        document.querySelector("#entity_menu").classList.remove("no_minimap")
      } else {
        document.querySelector("#mini_map_menu").style.display = 'none'
        document.querySelector("#mini_map_player_pos_label").style.display = 'none'
        document.querySelector("#entity_menu").classList.add("no_minimap")
      }
    }

    if (key === "showPlayerList") {
      if (this.shouldShowPlayerList()) {
        document.querySelector("#team_status_menu").style.display = 'block'
      } else {
        document.querySelector("#team_status_menu").style.display = 'none'
      }
    }

    if (key === "showTeamJoin") {
      if (this.settings.showTeamJoin) {
        this.game.teamMenu.showTeamJoinTab()
      } else {
        this.game.teamMenu.hideTeamJoinTab()
      }
    }

    if (key === "isStaminaEnabled") {
      if (this.settings.isStaminaEnabled) {
        this.game.showStaminaBar()
      } else {
        this.game.hideStaminaBar()
      }
    }

    if (key === "isHungerEnabled") {
      if (this.settings.isHungerEnabled) {
        this.game.showHungerBar()
      } else {
        this.game.hideHungerBar()
      }
    }

    if (key === "isOxygenEnabled") {
      if (this.settings.isOxygenEnabled) {
        this.game.showOxygenBar()
      } else {
        this.game.hideOxygenBar()
      }
    }

    if (key === "isChatEnabled") {
      if (this.settings.isChatEnabled) {
        document.querySelector("#chat_toggle_btn").style.display = 'block'
        this.game.chatMenu.close()
      } else {
        document.querySelector("#chat_toggle_btn").style.display = 'none'
        this.game.chatMenu.hide()
      }
    }

    if (key === "isShadowsEnabled") {
      this.game.sector.lightManager.setDarkness(this.game.hour)
    }

    if (key === "isCraftingEnabled") {
      if (this.settings.isCraftingEnabled) {
        document.querySelector("#blueprint_open_btn").style.display = 'block'
      } else {
        document.querySelector("#blueprint_open_btn").style.display = 'none'
      }
    }

  }

  setBuildSpeed(buildSpeed) {
    this.buildSpeed = buildSpeed
  }

  shouldShowChat() {
    return this.settings.isChatEnabled
  }

  shouldShowMiniMap() {
    return this.settings.showMiniMap
  }

  shouldShowPlayerList() {
    return this.settings.showPlayerList
  }

  setSellables(sellables) {
    this.sellables = sellables
    this.game.tradeMenu.initSellables()
  }

  setIsCustomSell(isCustomSell) {
    this.isCustomSell = isCustomSell
    this.game.tradeMenu.initPurchasables()
  }

  setPurchasables(purchasables) {
    this.purchasables = purchasables
  }

  getName() {
    return this.name
  }

  setSectorBans(sectorBans) {
    this.sectorBans = sectorBans
  }

  updateScreenshot(data) {
    if (data.clientMustDelete) {
      delete this.screenshots[data.id]
    } else {
      this.screenshots[data.id] = data.position
    }
  }

  getScreenshotCount() {
    return Object.keys(this.screenshots).length
  }

  showTutorialQuests(data) {
    if (data.name !== "Lobby") {
      this.game.tutorialMenu.open()
    }
  }

  isTutorial() {
    return this.name === "Tutorial Lobby"
  }

  isMiniGame() {
    return this.uid.match(/mini-.*-/)
  }

  onEntityChunkRegionPath(data) {
    this.entityToChunkRegionPaths[data.entityId] = this.entityToChunkRegionPaths[data.entityId] || {}
    this.entityToChunkRegionPaths[data.entityId][data.chunkRegionPath.id] = true

    this.syncWithServerForGroups(["chunkRegionPaths"], {
      chunkRegionPaths: [data.chunkRegionPath]
    })
  }

  getChunkRegionPathsFromEntityId(entityId) {
    let chunkRegionPathSet = this.entityToChunkRegionPaths[entityId]
    if (!chunkRegionPathSet) return []

    let chunkRegionPaths = []
    for (let chunkRegionPathId in chunkRegionPathSet) {
      let chunkRegionPath = this.chunkRegionPaths[chunkRegionPathId]
      if (chunkRegionPath) {
        chunkRegionPaths.push(chunkRegionPath)
      }
    }

    return chunkRegionPaths
  }

  isZoomAllowed() {
    if (this.isPvP()) return false
    return this.settings.isZoomAllowed
  }

  isPvP() {
    return this.gameMode === 'pvp'
  }

  isPeaceful() {
    return this.gameMode === 'peaceful'
  }

  isHardcore() {
    return this.gameMode === 'hardcore'
  }

  setGameMode(gameMode) {
    if (this.gameMode !== gameMode) {
      this.gameMode = gameMode
      this.onGameModeChanged()
    }
  }

  onGameModeChanged() {
    this.game.selectDifficultyMenu.close()
  }

  initSelection() {
    this.selection           = new Selection(this)
    this.persistentSelection = new Selection(this)
  }

  getRadAngle() {
    return this.angle * (Math.PI / 180)    
  }

  isLobby() {
    return this.name === "Lobby"
  }

  pick(row, col, globalMousePos, shouldIgnoreDynamic = false) {
    // dynamic units
    let dynamicEntity 
    let corpseEntity

    if (!shouldIgnoreDynamic) {
      dynamicEntity = this.pickUnit(row, col, globalMousePos)
      corpseEntity = this.pickCorpse(row, col, globalMousePos)
    }

    // foreground (i.e asteroid)
    let foregroundEntity = this.map.get(row, col)
    if (foregroundEntity) {
      return foregroundEntity
    }

    if (this.game.player.dragTargetId) {
      // prefer structure over corpse
      let structureEntity = this.structureMap.get(row, col)
      if (structureEntity) {
        return structureEntity
      }

      if (corpseEntity) {
        return corpseEntity
      }
    } else {
      // prefer corpse over structure
      if (corpseEntity) {
        return corpseEntity
      }

      let structureEntity = this.structureMap.get(row, col)
      if (structureEntity) {
        return structureEntity
      }
    }

    if (dynamicEntity) {
      return dynamicEntity
    }

    // static
    let grids = [
      this.armorMap,
      this.liquidDistributionMap,
      this.fuelDistributionMap,
      this.gasDistributionMap,
      this.distributionMap,
      this.railMap,
      this.platformMap,
      this.groundMap,
      this.undergroundMap
    ]

    let entity = null

    // static tiles first (asteroid/structure picked over player)
    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      entity = grid.get(row, col)
      if (entity) {
        break
      }
    }

    return entity
  }

  pickUnit(row, col, globalMousePos) {
    let entity
    let units = this.unitMap.get(row, col)

    if (units && Object.keys(units).length > 0) {
      let sortedEntities = Object.values(units).sort((a, b) => {
        let distanceA = Helper.distance(a.getX(), a.getY(), globalMousePos.x, globalMousePos.y)
        let distanceB = Helper.distance(b.getX(), b.getY(), globalMousePos.x, globalMousePos.y)

        return distanceA - distanceB
      }).filter((unit) => {
        return !unit.isHiddenFromView()
      })

      entity = sortedEntities[0]
    }

    return entity
  }

  pickCorpse(row, col, globalMousePos) {
    let entity
    let units = this.corpseMap.get(row, col)

    if (units && Object.keys(units).length > 0) {
      let sortedEntities = Object.values(units).sort((a, b) => {
        let distanceA = Helper.distance(a.getX(), a.getY(), globalMousePos.x, globalMousePos.y)
        let distanceB = Helper.distance(b.getX(), b.getY(), globalMousePos.x, globalMousePos.y)

        return distanceA - distanceB
      })

      entity = sortedEntities[0]
    }

    return entity
  }

  // here to avoid circuler dependency
  getConduitTexturesForRole(role) {
    let textures = null

    switch (role) {
      case "power":
        textures = Wire.getTextures()
        break
      case "liquid":
        textures = LiquidPipe.getTextures()
        break
      case "oxygen":
        textures = GasPipe.getTextures()
        break
      case "fuel":
        textures = FuelPipe.getTextures()
        break
    }

    return textures
  }

  getSpriteLayerForChunk(group, chunkRow, chunkCol) {
    let chunk = this.getChunk(chunkRow,chunkCol)
    if (!chunk) return null
      
    return chunk.getSpriteLayer(group)
  }

  initChunks() {
    const numOfTilesInRow  = this.getColCount()

    this.chunks = {}
    this.NUM_CHUNKS_IN_ROW = numOfTilesInRow / Constants.chunkRowCount
    this.NUM_CHUNKS_IN_COL = numOfTilesInRow / Constants.chunkRowCount
  }

  getChunkRegionById(id) {
    return this.chunkRegions[id]
  }

  getChunk(row, col) {
    if (row < 0 || row > this.NUM_CHUNKS_IN_ROW - 1) return null
    if (col < 0 || col > this.NUM_CHUNKS_IN_COL - 1) return null

    let chunkKey = Chunk.getKey(row, col)
    if (!this.chunks[chunkKey]) {
      this.chunks[chunkKey] = new Chunk(this, row, col)
    }

    return this.chunks[chunkKey]
  }

  forEachChunk(cb) {
    for (let chunkKey in this.chunks) {
      cb(this.chunks[chunkKey])
    }
  }

  getEntity(id) {
    return this.entities[id]
  }

  registerGlobalEntity(entity) {
    this.entities[entity.id] = entity
  }

  unregisterGlobalEntity(entity) {
    delete this.entities[entity.id]
  }

  initLightManager() {
    this.lightManager = new LightManager(this)
  }

  initHomeArea() {
    this.homeArea = new HomeArea(this)
  }

  nightMode() {
    this.lightManager.nightMode()
  }

  dayMode() {
    this.lightManager.dayMode()
  }

  initSprite() {
    this.sprite = this.getSprite()
    this.postInitSprite()
  }

  initRoomAlertManager() {
    this.roomAlertManager = new RoomAlertManager(this)
  }

  initPlayers(data) {
    this.setOriginalPlayerList(data.players)

    for(let i in data.players) {
      let playerData = data.players[i]
      let player = new Player(playerData, this)
      this.players[player.id] = player
    }
  }

  setOriginalPlayerList(players) {
    this.originalPlayers = players

    for (let id in players) {
      let player = players[id]
      if (player.equipments.storage[0]) {
        let color = player.equipments.storage[0].instance.content
        this.originalColors[player.id] = color
      }
    }
  }

  addToOriginalPlayers(player) {
    this.originalPlayers[player.id] = player

    if (player.equipments.storage[0]) {
      let color = player.equipments.storage[0].instance.content
      this.originalColors[player.id] = color
    }
  }

  removeFromOriginalPlayers(playerId) {
    delete this.originalPlayers[playerId]
  }

  setOriginalPlayerLeft(playerId) {
    if (this.originalPlayers[playerId]) {
      this.originalPlayers[playerId].hasLeftGame = true
    }
  }

  destroyTextures() {
    if (this.backgroundSprite) {
      this.backgroundSprite.texture.destroy()
    }

    for (let id in this.chunks) {
      let chunk = this.chunks[id]
      chunk.cleanup()
    }

    if (this.progressCircle && this.progressCircle.graphicsData) {
      this.progressCircle.destroy()
    }
  }

  registerBar(bar) {
    this.bars = this.bars || {}
    this.bars[bar.entity.getId()] = bar
  }

  unregisterBar(bar) {
    delete this.bars[bar.entity.getId()]
  }

  getBar(entity) {
    return this.bars[entity.getId()]
  }

  cleanup() {
    this.bars = {}
    this.originalColors = {}
    this.buttons = {}
    this.settings = {}

    this.regionTree.clear()

    ObjectPool.reset()
    this.destroyTextures()
    this.lightManager.cleanup()

    let collections = [
      this.movableGroups,
      this.terrainGroups,
      this.clientDebugGroups,
      this.roomGroups,
      this.buildingGroups,
      this.structureGroups,
      this.wallGroups,
      this.ceilingGroups,
      this.tileGroups
    ]

    collections.forEach((groups) => {
      groups.forEach((group) => {
        this.removeAllEntities(group)
      })
    })

    this.initGrids()

    this.removeAllEntities("terrains")

    this.backgroundGroups.forEach((group) => {
      this.removeAllNonIdEntities(group)
    })

    if (this.groundEffectsContainer) {
      this.groundEffectsContainer.children.forEach((sprite) => {
        ClientHelper.removeSelfAndChildrens(sprite)
      })
    }

    this.effectsContainer.children.forEach((sprite) => {
      ClientHelper.removeSelfAndChildrens(sprite)
    })

    this.roomAlertManager.clear()

    this.invalidAreaSprite.alpha = 0

    this.entities = {}

  }

  remove() {
    this.cleanup()
    ClientHelper.removeSelfAndChildrens(this.sprite)
  }

  renderBackgrounds() {
    let starCount = 50
    let backgrounds = []

    for (var i = 0; i < starCount; i++) {
      backgrounds.push(this.randomStar())
    }

    this.renderBackgroundGroup(backgrounds)
  }

  randomStar() {
    let tileCount = 32
    const randomRow = Math.floor(Math.random() * tileCount)
    const randomCol = Math.floor(Math.random() * tileCount)
    const randomWidth = Math.floor(Math.random() * 3) + 2

    return {
      x: randomCol * Constants.tileSize,
      y: randomRow * Constants.tileSize,
      w: randomWidth,
      h: randomWidth,
      type: Protocol.definition().BackgroundType.Star
    }
  }

  renderBackgroundGroup(backgrounds) {
    let sprites = []
    for (var i = 0; i < backgrounds.length; i++) {
      let data = backgrounds[i]
      let sprite = Backgrounds.forType(data.type).build(this.game, data)
      sprites.push(sprite)
    }
    
    this.backgroundSpriteContainer.alpha = 1
    let tileCount = 32
    let texture = PIXI.RenderTexture.create(tileCount * Constants.tileSize, tileCount * Constants.tileSize)
    this.game.app.renderer.render(this.backgroundSpriteContainer, texture)
    if (this.backgroundSpriteContainer.parent) {
      this.backgroundSpriteContainer.parent.removeChild(this.backgroundSpriteContainer)
    }

    for (var i = 0; i < sprites.length; i++) {
      sprites[i].remove()
    }

    this.backgroundSprite.texture = texture
  }

  onRemovePlayer(data) {
    const targetPlayer = this.players[data.playerId]

    if (targetPlayer) {
      this.removeEntity(targetPlayer, "players")
    }

  }

  onCollisionDetected(data) {
    if (this.prevBoxes) {
      this.prevBoxes.forEach((box) => {
        this.effectsContainer.removeChild(box.graphics)
        this.effectsContainer.removeChild(box.text)
      })

      this.prevBoxes = []
    }

    this.drawBox(data.sourceBox, 0xff0000)
    this.drawBox(data.otherBox, 0x00ff00)
  }

  onCircleCollision(data) {
    if (this.prevCircles) {
      this.prevCircles.forEach((circle) => {
        circle.parent.removeChild(circle)
      })

      this.prevCircles = []
    }

    data.circles.forEach((data) => {
      this.drawCircle(data, 0x0000ff)
    })

  }

  drawCircle(circle, color) {
    let graphics = new PIXI.Graphics()
    graphics.position.x = circle.x
    graphics.position.y = circle.y
    graphics.beginFill(color)
    graphics.drawCircle(0, 0, circle.radius)
    graphics.endFill()
    graphics.alpha = 0.3
    this.effectsContainer.addChild(graphics)

    this.prevCircles = this.prevCircles || []
    this.prevCircles.push(graphics)
  }

  initProgressCircle() {
    this.progressCircleContainer = new PIXI.Container()
    this.progressCircleContainer.name = 'ProgressCircleContainer' 
    this.progressCircleContainer.position.y = -96

    let blackCircle = new PIXI.Sprite(PIXI.utils.TextureCache['white_gas.png'])
    blackCircle.anchor.set(0.5)
    blackCircle.tint = 0x000000
    blackCircle.width = 96
    blackCircle.height = 96
    blackCircle.alpha = 0.5
    this.progressCircleContainer.addChild(blackCircle)

    this.progressCircle = new PIXI.Graphics()
    this.progressCircleAngle = 0

    this.progressCircleContainer.addChild(this.progressCircle)
  }

  startProgressCircle(completeTimestamp) {
    this.game.player.sprite.addChild(this.progressCircleContainer)
    this.progressCircleContainer.visible = true

    this.progressCircle.clear()
    this.progressCircleAngle = 0

    this.progressCircleStartTimestamp = this.game.timestamp
    this.progressCircleCompleteTimestamp = completeTimestamp
  }

  hideProgressCircle() {
    this.progressCircleContainer.parent.removeChild(this.progressCircleContainer)
    this.progressCircleContainer.visible = false

    this.progressCircleCompleteTimestamp = null
  }

  renderProgressCircle() {
    let padding = 3
    let duration = this.progressCircleCompleteTimestamp - this.progressCircleStartTimestamp - padding
    let elapsed = this.game.timestamp - this.progressCircleStartTimestamp
    let percentComplete = elapsed / duration

    let cx = 0
    let cy = 0
    let radius = 30
    let startAngle = 0
    let endAngle = Math.PI * 2 * percentComplete

    if (this.progressCircleTween) {
      this.progressCircleTween.stop()
    }

    let angle = { angle: this.progressCircleAngle }
    this.progressCircleTween = new TWEEN.Tween(angle)
        .to({ angle: endAngle }, 300)
        .onUpdate(() => {
          this.progressCircle.clear()
          this.progressCircle.lineStyle(6, 0xCCCCCC, 0.9)
          this.progressCircle.arc(cx, cy, radius, startAngle, angle.angle)
          this.progressCircleAngle = angle.angle
        })

    this.progressCircleTween.start()
  }

  drawBox(box, color) {
    let graphics = new PIXI.Graphics()
    graphics.position.x = box.pos.x
    graphics.position.y = box.pos.y
    graphics.lineStyle(2, color)
    graphics.drawRect(0, 0, box.w, box.h)
    this.effectsContainer.addChild(graphics)

    const style  = { fontFamily : 'Arial', fontSize: 20, fill : 0xffd700, align : 'center', strokeThickness: 5, miterLimit: 3 }
    const text = new PIXI.Text([box.pos.x, box.pos.y, box.w, box.h].join(","), style)
    text.position.x = box.pos.x
    text.position.y = box.pos.y
    this.effectsContainer.addChild(text)

    this.prevBoxes = this.prevBoxes || []
    this.prevBoxes.push({ graphics: graphics, text: text })
  }

  box(x, y, container) {
    let graphics = new PIXI.Graphics()
    graphics.position.x = x
    graphics.position.y = y
    graphics.lineStyle(2, 0xff0000)
    graphics.drawRect(0, 0, 100, 100)
    container.addChild(graphics)
  }

  onPlayerLeave(data) {
    const targetPlayer = this.players[data.id]

    if (targetPlayer) {
      this.removeEntity(targetPlayer, "players")
    }
  }

  getInvalidAreaSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["red.png"])
    sprite.name = "InvalidArea"
    sprite.anchor.set(0.5)
    sprite.alpha = 0
    return sprite
  }

  getRegionAreaSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["green.png"])
    sprite.name = "Region"
    sprite.anchor.set(0.5)
    sprite.alpha = 0
    return sprite
  }

  getSprite() {
    const sprite = new PIXI.Container()
    sprite.name = "Sector"
    this.gameBoundsSprite           = this.getGameBoundsSprite()
    this.backgroundSpriteContainer  = new PIXI.Container()
    this.backgroundSpriteContainer.alpha = 0

    // z-order based on add order
    sprite.addChild(this.gameBoundsSprite)
    sprite.addChild(this.backgroundSpriteContainer)

    return sprite
  }

  drawRange(box) {
    if (this.rangeBox) {
      this.rangeBox.parent.removeChild(this.rangeBox)
    }

    this.rangeBox = new PIXI.Graphics()
    this.rangeBox.beginFill(0x00ff00)
    this.rangeBox.drawRect(box.pos.x, box.pos.y, box.w, box.h)
    this.rangeBox.endFill()
    this.rangeBox.alpha = 0.3
    this.effectsContainer.addChild(this.rangeBox)
  }

  getVisibleArea() {
    const screenWidth = window.innerWidth / this.game.resolution
    const screenHeight = window.innerHeight / this.game.resolution

    let visibleTopLeftY = Math.max(0, -this.game.cameraDisplacement.y - screenHeight/2)
    let visibleTopLeftX = Math.max(0, -this.game.cameraDisplacement.x - screenWidth/2)

    let visibleBottomRightY = visibleTopLeftY + screenHeight
    let visibleBottomRightX = visibleTopLeftX + screenWidth

    const visibleTopLeftRow = Math.floor(visibleTopLeftY / Constants.tileSize)
    const visibleTopLeftCol = Math.floor(visibleTopLeftX / Constants.tileSize)
    const visibleBottomRightRow = Math.floor(visibleBottomRightY / Constants.tileSize)
    const visibleBottomRightCol = Math.floor(visibleBottomRightX / Constants.tileSize)

    const visibleRowCount = visibleBottomRightRow - visibleTopLeftRow + 1
    const visibleColCount = visibleBottomRightCol - visibleTopLeftCol + 1

    return {
      topLeft: {
        x: visibleTopLeftX,
        y: visibleTopLeftY,
        row: visibleTopLeftRow,
        col: visibleTopLeftCol
      },
      bottomRight: {
        x: visibleBottomRightX,
        y: visibleBottomRightY,
        row: visibleBottomRightRow,
        col: visibleBottomRightCol
      },
      rowCount: visibleRowCount,
      colCount: visibleColCount
    }
  }

  getHangarFadeBlackSprite() {
    let sprite = new PIXI.Sprite(PIXI.utils.TextureCache["black.png"])
    sprite.name = "hangar_fade_black"
    sprite.alpha = 0
    sprite.width = window.innerWidth
    sprite.height = window.innerHeight
    sprite.anchor.set(0.5)
    return sprite
  }

  getHangarBackgroundSprite() {
    let sprite = new PIXI.extras.TilingSprite(PIXI.utils.TextureCache["hangar_background.png"])
    sprite.name = "hangar_background"
    sprite.alpha = 0
    sprite.anchor.set(0.5)
    return sprite
  }

  showHangarBackgroundSprite(region) {
    this.hangarBackgroundSprite.alpha = 0.7
    this.hangarBackgroundSprite.position.x = region.getX()
    this.hangarBackgroundSprite.position.y = region.getY()
    this.hangarBackgroundSprite.width = region.getWidth()
    this.hangarBackgroundSprite.height = region.getHeight()
  }

  hideHangarBackgroundSprite() {
    this.hangarBackgroundSprite.alpha = 0
  }

  showHangarFadeBlackSprite() {
    this.repositionFadeBlackSprite()
    this.getHangarFadeBlackTween(0, 0.9).start()
  }

  repositionFadeBlackSprite() {
    if (this.game.player) {
      this.hangarFadeBlackSprite.position.x = this.game.player.getX()
      this.hangarFadeBlackSprite.position.y = this.game.player.getY()
    }
  }

  hideHangarFadeBlackSprite() {
    this.getHangarFadeBlackTween(0.9, 0).start()
  }

  getHangarFadeBlackTween(start, end) {
    let opacity = { opacity: start }
    let sprite = this.hangarFadeBlackSprite

    return new TWEEN.Tween(opacity)
        .to({ opacity: end }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          sprite.alpha = opacity.opacity
        })
  }

  postInitSprite() {
    this.backgroundSprite  = new PIXI.extras.TilingSprite(PIXI.utils.TextureCache["hangar_background.png"], this.getSectorWidth(), this.getSectorHeight())
    this.backgroundSprite.name = "Backgrounds" 
    this.sprite.addChild(this.backgroundSprite)

    this.createSpriteLayersFor(this.sprite, this.terrainGroups)
    this.createSpriteLayersFor(this.sprite, this.buildingGroups)
    this.createSpriteLayersFor(this.sprite, this.wallGroups)

    this.hangarFadeBlackSprite = this.getHangarFadeBlackSprite()
    this.sprite.addChild(this.hangarFadeBlackSprite)

    this.hangarBackgroundSprite = this.getHangarBackgroundSprite()
    this.sprite.addChild(this.hangarBackgroundSprite)

    this.hangarContainer = new PIXI.Container()
    this.hangarContainer.name = "HangarContainer"
    this.sprite.addChild(this.hangarContainer)

    this.groundEffectsContainer = new PIXI.Container()
    this.groundEffectsContainer.name = "GroundEffects"
    this.sprite.addChild(this.groundEffectsContainer)

    this.highGroundEffectsContainer = new PIXI.Container()
    this.highGroundEffectsContainer.name = "HighGroundEffects"
    this.sprite.addChild(this.highGroundEffectsContainer)

    this.createSpriteLayersFor(this.sprite, this.structureGroups)
    this.createSpriteLayersFor(this.sprite, this.clientDebugGroups)

    this.createSpriteLayersFor(this.sprite, this.movableGroups)
    this.createSpriteLayersFor(this.sprite, this.roomGroups)
    this.createSpriteLayersFor(this.sprite, this.homeAreaGroups)

    this.createSpriteLayersFor(this.sprite, this.ceilingGroups)
    this.createSpriteLayersFor(this.sprite, this.networkGroups)

    this.invalidAreaSprite = this.getInvalidAreaSprite()
    this.regionAreaSprite = this.getRegionAreaSprite()

    this.rangeContainerSprite = this.createSpriteLayer("Range")

    this.effectsContainer  = new PIXI.Container()
    this.effectsContainer.name = "Effects"

    this.createLightMapContainer()

    this.chunkDebugSprite = new PIXI.Container()
    this.chunkDebugSprite.name = "ChunkDebugContainer"

    this.chunkRegionContainer = new PIXI.Container()
    this.chunkRegionContainer.name = "ChunkRegionContainer"

    this.regionContainer = new PIXI.Container()
    this.regionContainer.name = "RegionContainer"
    this.regionContainer.visible = false

    this.sprite.addChild(this.lightMapContainer)
    this.sprite.addChild(this.rangeContainerSprite)
    this.sprite.addChild(this.invalidAreaSprite)
    this.sprite.addChild(this.regionAreaSprite)
    this.sprite.addChild(this.chunkDebugSprite)
    this.sprite.addChild(this.chunkRegionContainer)
    this.sprite.addChild(this.regionContainer)
    this.sprite.addChild(this.effectsContainer)
  }

  createLightMapContainer() {
    this.lightMapContainer = new PIXI.Container()
    this.lightMapContainer.alpha = 0.95
    if (this.game.isCanvasMode()) {
      this.lightMapContainer.alpha = 0
    }
    
    let multiplyBlend = new PIXI.filters.AlphaFilter()
    multiplyBlend.blendMode = PIXI.BLEND_MODES.MULTIPLY
    this.lightMapContainer.filters = [multiplyBlend]

    this.skyMapSprite = new PIXI.Sprite()
    this.skyMapSprite.width  = this.getSectorWidth()
    this.skyMapSprite.height = this.getSectorHeight()
    this.skyMapSprite.texture = PIXI.Texture.fromCanvas(this.lightManager.skyMapCanvas)
    this.skyMapSprite.name = 'SkyMapSprite'


    this.dynamicLightSprite = new PIXI.Container()
    this.dynamicLightSprite.name = "DynamicLightSprite"
    // this.dynamicLightSprite.filters = [alphaFilter]

    this.fovMapSprite = new PIXI.Sprite()
    this.fovMapSprite.width  = this.getSectorWidth()
    this.fovMapSprite.height = this.getSectorHeight()
    this.fovMapSprite.name = "FovMap"
    this.fovMapSprite.texture = PIXI.Texture.fromCanvas(this.lightManager.fovMapCanvas)
    

    this.lightMapSprite = new PIXI.Sprite()
    this.lightMapSprite.width  = this.getSectorWidth()
    this.lightMapSprite.height = this.getSectorHeight()
    this.lightMapSprite.name = "LightMap"
    this.lightMapSprite.texture = PIXI.Texture.fromCanvas(this.lightManager.lightMapCanvas)

    // this.illuminationContainer.addChild(this.dynamicLightSprite)
    // this.illuminationContainer.addChild(this.lightMapSprite)

    this.detailedLightMapContainer = new PIXI.Container()
    this.detailedLightMapContainer.width  = this.getSectorWidth()
    this.detailedLightMapContainer.height = this.getSectorHeight()
    this.detailedLightMapContainer.name = "DetailedLightMapContainer"

    this.sprite.addChild(this.fovMapSprite)

    this.lightMapContainer.addChild(this.skyMapSprite)
    this.lightMapContainer.addChild(this.dynamicLightSprite)
    this.lightMapContainer.addChild(this.lightMapSprite)
  }

  isFovMode() {
    return this.settings.isFovMode
  }

  applyFovMaskToLight() {
    this.lightMapSprite.mask = this.fovMapSprite
    this.dynamicLightSprite.mask = this.fovMapSprite
  }

  removeFovMaskFromLight() {
    this.lightMapSprite.mask = null
    this.dynamicLightSprite.mask = null
  }

  addTerminalMessage(message) {
    if (this.terminalMessages.length >= 200) {
      this.terminalMessages.shift()
    }

    this.terminalMessages.push(message)
  }

  onSelectionChanged(entity) {
    if (!entity) return

    if (this.game.main.isMobile) {
      if (entity.isMob() ) {
        if (entity.isMountable(this.game.player)) {
          this.game.setMobileAction("mount")
        }
      } else if (entity.isBuildingType() && entity.isInteractable()) {
        if (entity.isItemStorage()) {
          this.game.setMobileAction("open")
        } else if (entity.hasCategory("switch")) {
          if (entity.isOpen) {
            this.game.setMobileAction("off")
          } else {
            this.game.setMobileAction("on")
          }
        } else if (entity.hasCategory("door")) {
          if (entity.isOpen) {
            this.game.setMobileAction("close")
          } else {
            this.game.setMobileAction("open")
          }
        } else if (entity.hasCategory("ammo_turret")) {
          this.game.setMobileAction("open")
        } else if (entity.isProducer()) {
          this.game.setMobileAction("use")
        } else if (entity.isHarvestable) {
          this.game.setMobileAction("pick")
        } else if (entity.getConstants().interactButtonMessage) {
          this.game.setMobileAction(entity.getConstants().interactButtonMessage)
        } else if (entity.isUsable()) {
          this.game.setMobileAction("use")
        } else {
          this.game.setDefaultMobileAction()
        }
      } else if (entity.isForegroundTile() && this.game.player.hasMineTarget()) { 
        this.game.setMobileAction("mine")
      } else if (entity.isCorpse()) { 
        if (this.game.player.dragTargetId === entity.id) {
          this.game.setMobileAction("release")
        } else {
          this.game.setMobileAction("drag")
        }
      } else {
        this.game.setDefaultMobileAction()
      }
    } else {
      if (entity.shouldShowInteractTooltip()) {
        this.game.showActionTooltip(entity)
      }
    }
  }

  onSelectionRemoved(entity) {
    if (this.game.main.isMobile) {
      this.game.setDefaultMobileAction()
    } else {
      this.game.hideActionTooltip(entity)
    }
  }


  showStarMap() {
    this.starMap.visible = true
  }

  hideStarMap() {
    this.starMap.visible = false
  }

  highlight(entity) {
    this.selection.highlight(entity)
  }

  unhighlight(entity) {
    this.selection.unhighlight(entity)
  }

  select(entity) {
    if (this.game.isMobile()) return

    this.persistentSelection.highlight(entity)
  }

  unselect(entity) {
    if (this.game.isMobile()) return

    this.persistentSelection.unhighlight(entity)
  }

  setLocations(data) {
    let x = 200
    let y = window.innerHeight/2
    for (var i = 0; i < data.locations.length; i++) {
      let location = data.locations[i]
      location.x = x + i * 200
      location.y = y
      this.starmapLocations[location.id] = new StarmapLocation(this.game, location)
    }
  }

  getGameBoundsSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["square_white.png"])
    sprite.name = "GameBounds"
    // sprite.tint = 0x4f495f // light purple
    sprite.tint = 0x00ff00 // bright green for debuggability
    sprite.tint = 0x112944
    sprite.width  = this.getSectorWidth()
    sprite.height = this.getSectorHeight()
    return sprite
  }

  syncWithServer(data) {
    this.lightManager.updateLightMapTexture()
    this.lightManager.redrawChangedLightSources()

    if (this.progressCircleCompleteTimestamp) {
      this.renderProgressCircle()
    }
  }

  onChunk(data, options = {}) {
    this.arrayifyChunkEntityData(data)

    let chunk = this.getChunk(data.row, data.col)
    if (chunk) {
      chunk.removeStale(data)
    }

    this.syncTerrains(data, options)
    this.syncWithServerForGroups(["buildings"], data, options)
    this.syncWithServerForGroups(["players"], data, options)
    this.syncWithServerForGroups(["corpses"], data, options)
    this.syncWithServerForGroups(["projectiles"], data, options)
    this.syncWithServerForGroups(["rooms"], data, options)
    this.syncWithServerForGroups(["mobs"], data, options)
    this.syncWithServerForGroups(["pickups"], data, options)

    this.onFullChunkReceived()
  }

  onFullChunkReceived() {
    if (this.isFovMode()) {
      this.reapplyFov()
    }
  }

  reapplyFov() {
    if (this.game.player && this.game.player.isSpectating()) return
      
    clearTimeout(this.reapplyFovTimeout)

    this.reapplyFovTimeout = setTimeout(() => {
      this.lightManager.applyFov()
    }, 500)
  }

  addChunksToCache(chunk) {
    this.chunksToCache[chunk.id] = chunk
  }

  cacheChunks() {
    if (!this.isOneSecondInterval()) return

    for (let id in this.chunksToCache) {
      let chunk = this.chunksToCache[id]
      chunk.cacheLayers()  
      if (!chunk.hasLayersToCache()) {
        delete this.chunksToCache[id]
      }
    }

  }

  arrayifyChunkEntityData(data) {
    data.terrains = Object.values(data.terrains)
    data.buildings = Object.values(data.buildings)
    data.players = Object.values(data.players)
    data.corpses = Object.values(data.corpses)
    data.projectiles = Object.values(data.projectiles)
    data.rooms = Object.values(data.rooms)
    data.mobs = Object.values(data.mobs)
    data.pickups = Object.values(data.pickups)

    if (data.hasOwnProperty("transports")) {
      data.transports = Object.values(data.transports)
    }
  }

  onEntityUpdated(data) {
    this.arrayifyChunkEntityData(data)

    if (data.hasOwnProperty("terrains") || data.hasOwnerProperty("buildings")) {
      this.syncTerrains(data)
      this.syncWithServerForGroups(["buildings"], data)
    }

    this.syncWithServerForGroups(["players"], data)
    this.syncWithServerForGroups(["corpses"], data)
    this.syncWithServerForGroups(["projectiles"], data)
    this.syncWithServerForGroups(["rooms"], data)
    this.syncWithServerForGroups(["mobs"], data)
    this.syncWithServerForGroups(["pickups"], data)
    this.syncWithServerForGroups(["transports"], data)

    this.syncRoomTiles(data)
  }

  syncRoomTiles(data) {
    for (let roomId in data.roomTiles) {
      let roomTileMap = data.roomTiles[roomId]
      let roomTileList = Object.values(roomTileMap.tiles)
      let room = this.rooms[roomId]
      if (room) {
        let roomTileBatches = Helper.batch(roomTileList, 20)
        this.processRoomTileUpdate(room, roomTileBatches)
      }
    }
  }

  processRoomTileUpdate(room, roomTileBatches) {
    let roomTileBatch = roomTileBatches.shift()

    if (roomTileBatch) {
      room.syncWithServer({ tiles: roomTileBatch })

      setTimeout(this.processRoomTileUpdate.bind(this, room, roomTileBatches), 10)
    } else {
      // finished
    }
  }

  incrementTick() {
    this.tick += 1

    if (this.tick > 60) {
      this.tick = 0
    }
  }

  isOneSecondInterval() {
    return this.tick === 60
  }

  executeTurn() {
    this.incrementTick()

    try {
      let start = Date.now()
      this.processEntitySyncQueue()

      this.interpolateEntities()  
      this.cacheChunks()

      let elapsed = Date.now() - start

      if (elapsed <= 5) {
        this.lightManager.processQueue()
        this.processMapRenderQueue()
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  processMapRenderQueue() {
    this.game.mapMenu.processRenderQueue()
  }

  interpolateEntities() {
    this.movableGroups.forEach((group) => {
      for (let key in this[group]) {
        let entity = this[group][key]
        entity.interpolate(this.game.lastFrameTime)
      }
    })
  }

  getSpriteContainer() {
    return this.game.sectorSpriteContainer
  }

  isMovable() {
    return false
  }

  getX() {
    return this.getSectorWidth() / 2
  }

  getY() {
    return this.getSectorHeight() / 2
  }

  getSectorWidth() {
    return this.getColCount() * Constants.tileSize
  }

  getSectorHeight() {
    return this.getRowCount() * Constants.tileSize
  }

}

Object.assign(Sector.prototype, Container.prototype, {
  getRowCount() {
    return this.rowCount
  },
  getColCount() {
    return this.colCount
  },
  getGridRulerTopLeft() {
    return {
      x: 0,
      y: 0
    }
  }
})

Object.assign(Sector.prototype, ClientContainer.prototype, {
})

module.exports = Sector
