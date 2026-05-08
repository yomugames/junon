const rbush = require("rbush")
const Constants = require('../../common/constants.json')
const Grid = require('../../common/entities/grid')
const ChunkGrid = require('../../common/entities/chunk_grid')
const Protocol = require('../../common/util/protocol')
const Container = require('../../common/interfaces/container')
const Storable = require('../../common/interfaces/container')
const Owner = require('../../common/interfaces/owner')
const Buildings = require("./buildings/index")
const LOG = require('junon-common/logger')
const Mobs = require("./mobs/index")
const Equipments = require("./equipments/index")
const Corpse = require("./corpse")
const Terrains = require("./terrains/index")
const Ores = require("./ores/index")
const Transports = require("./transports/index")
const EntityGroup = require("./entity_group")
const Region = require("./region")
const Button = require("./button")
const Wave = require("./wave")
const Blueprint = require("./blueprint")
const Team = require("./team")
const RoomManager = require("./networks/room_manager")
const PowerManager = require("./networks/power_manager")
const OxygenManager = require("./networks/oxygen_manager")
const LiquidManager = require("./networks/liquid_manager")
const FuelManager = require("./networks/fuel_manager")
const PressureManager = require("./networks/pressure_manager")
const RailManager = require("./networks/rail_manager")
const SoilManager = require("./networks/soil_manager")
const Ship = require("./ship")
const Pickup = require("./pickup")
const Item = require("./item")
const Projectiles = require("./projectiles/index")
const PathFinder = require("./../ai/path_finder")
const MapGenerator = require("./../util/map_generator")
const FirebaseAdminHelper = require("../util/firebase_admin_helper")
const Chunk = require("./chunk")
const Helper = require('../../common/helper')
const FovManager = require('../../common/entities/fov')
const MobManager = require('./../ai/mob_manager')
const LandManager = require('./terrains/land_manager')
const PoolManager = require('./terrains/pool_manager')
const FloodFillManager = require('../../common/entities/flood_fill_manager')
const FloodFillQueue = require('../../common/entities/flood_fill_queue')
const ExceptionReporter = require('junon-common/exception_reporter')
const HomeArea = require("./home_area")
const Player = require("./player")
const PlayerData = require("./player_data")
const Continent = require("./continent")
const Sharp = require("sharp")
const SectorModel = require("junon-common/db/sector")
const Favorite = require("junon-common/db/favorite")
const SectorBan = require("junon-common/db/sector_ban")
const Vote = require("junon-common/db/vote")
const uuidv4 = require('uuid/v4')
const Claim = require("./claim")
const MobTaskQueue = require("./mob_task_queue")
const SectorLoader = require("./sector_loader")
const sequelize = require("junon-common/db/sequelize")
const VoteManager = require("./vote_manager")
const EventHandler = require("./event_handler")
const MiniGameObjectives = require("./minigame_objectives")
const FindTheImposter = require("./minigames/find_the_imposter")
const BedWars = require("./minigames/bed_wars")
const TowerDefense = require("./minigames/tower_defense")
const Domination = require("./minigames/domination")
const CommandBlock = require("../command_blocks/command_block")
const PositionSearchRequest = require("./position_search_request")
const Foods = require("./foods/index")

class Sector {

  constructor(game, metadata, entities) {
    this.game  = game

    this.id    = metadata.id || game.generateEntityId()

    this.uid = this.game.sectorUid || this.id.toString()

    this.sector = this
    game.sector = this
    this.name = metadata.name
    this.game.registerEntity(this)

    this.gameMode = metadata.gameMode

    this.floodFillQueue = new FloodFillQueue()
    this.mobTaskQueue = new MobTaskQueue(this)

    if (metadata.blueprintData) {
      this.rowCount = metadata.blueprintData.rowCount
      this.colCount = metadata.blueprintData.colCount
    } else if (metadata.rowCount) {
      this.rowCount = metadata.rowCount
      this.colCount = metadata.colCount
    }

    if (!this.rowCount) {
      this.rowCount = 128
      this.colCount = 128
    }

    let sectorModel = this.game.sectorModel
    if (sectorModel) {
      this.createdAt = (new Date(sectorModel.createdAt).getTime()) / 1000
    }

    this.initVariables()
    this.initGrids()
    this.initOtherGrids()

    this.initChunks()
    this.platformMap.setBoundaryDetector(this.isPlatformBoundary)

    this.createTrees() // must go before map init

    this.initOwner()

    this.initPathFinder()
    this.initLandManager()
    this.initPoolManager()
    this.initVoteManager()
    this.initSectorLoader()
    this.initPrivacy()
    this.initEventHandler()
    this.initSettings(entities)
    this.initCustomStats(entities)
    this.initGlobalVariables(entities)

    this.initMap(entities)
    this.groundMap.setBoundaryDetector(this.isGroundBoundary)

    this.initPressureManager()
    this.initOxygenManager()
    this.initLiquidManager()
    this.initFuelManager()
    this.initRoomManager()
    this.initPowerManager()
    this.initRailManager()
    this.initSoilManager()
    this.fetchScreenshots()
    this.initFavoriteCount()
    this.initVotes()
    this.initBans()
    this.initExecutors()
    this.initMobManager()
    this.initFovManager()
    this.initActivityLogs(entities)
    this.initCommandLogs(entities)
    this.initKits(entities)
    this.initSellables(entities)
    this.initPurchasables(entities)
    this.initRegions(entities)
    this.initButtons(entities)
    this.initCommandBlock(entities)
    this.initBuildLimits(entities)
    this.initKeyCodes(entities)

    this.initObjectives()

    this.applyBlueprint(metadata.blueprintData)
    if (!entities) {
      // nothing to load from save file
      this.sectorLoader.isFinished = true
      this.onFinishedLoading()
    } else {
      this.disableChunkInvalidations()
      this.game.server.addSectorLoadQueue(this, metadata, entities)
      return
    }
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  initObjectives() {
    if (debugMode) {
      if (this.game.origSectorUid === "eWC1CfZymRExY") {
        MiniGameObjectives.init(this)
      }
    } else {
      if (this.game.origSectorUid === "Ap9OYBkw3dQvJ") {
        MiniGameObjectives.init(this)
      }
    }
  }

  initBuildLimits(entities) {
    this.buildLimits = {}
  }

  setBuildLimit(klassName, limit) {
    this.buildLimits[klassName] = limit
  }

  initKeyCodes(entities) {
    this.keyCodes = {}

    if(!entities || !entities.keyCodes) return

    this.keyCodes = entities.keyCodes
  }

  getBuildLimit(klassName) {
    if (!this.buildLimits.hasOwnProperty(klassName)) return 99999
    return this.buildLimits[klassName]
  }

  removeBuildLimit(klassName, limit) {
    delete this.buildLimits[klassName]
  }

  addCommandBlockTimer(timer) {
    this.commandBlockTimers[timer.id] = timer

    this.onCommandBlockTimerUpdated(timer.toJson())
  }

  removeCommandBlockTimer(timer) {
    delete this.commandBlockTimers[timer.id]

    this.onCommandBlockTimerUpdated({
      id: timer.id,
      clientMustDelete: true
    })
  }

  onCommandBlockTimerUpdated(timer) {
    let data = {
      commandBlockTimers: {}
    }

    data.commandBlockTimers[timer.id] = timer

    this.getSocketUtil().broadcast(this.getSocketIds(), "CommandBlockTimerUpdated", data)
  }


  initCommandBlock(entities) {
    this.commandBlock = new CommandBlock(this)

    let json
    try {
      if (this.canUseCommandBlocks()) {
        json  = JSON.parse(entities.commandBlockFullJson)
      }
    } catch(e) {
    }

    if (json) {
      this.commandBlock.applyData(json)
    } else if (false) {
      this.commandBlock.applyData(this.getSampleCommandBlockJson())
    }

    this.importCommandBlockToEventHandler()
  }

  onScoreChanged() {
    if (this.game.globalSidebar.isPlayerScoreboard()) {
      this.game.globalSidebar.computeScoreboard()
      this.game.globalSidebar.broadcastContents()
    }
  }

  updateTeamScoreboard() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (!this.isTeamScoreboardChanged) return

    if (this.game.globalSidebar.isTeamScoreboard()) {
      this.game.globalSidebar.computeScoreboard()
      this.game.globalSidebar.broadcastContents()
    }

    this.isTeamScoreboardChanged = false
  }

  setTeamScoreboardChanged() {
    this.isTeamScoreboardChanged = true
  }

  hasGravity() {
    return this.settings['isGravityEnabled']
  }

  importCommandBlockToEventHandler() {
    if (!this.commandBlock.isEnabled) return
    if (!this.canUseCommandBlocks()) return

    if (this.isMiniGame()) {
      if (!this.miniGame.shouldImportCommandBlock()) return
    }

    if (this.game.origSectorUid === "BPF0uFha5QLUr" ||
        this.game.origSectorUid === "PnGkJd5xZsb0v") {
      if (this.isMiniGame()) {
        this.eventHandler.importFromCommandBlock(this.commandBlock)
      }
    } else {
      this.eventHandler.importFromCommandBlock(this.commandBlock)
    }

  }

  findNewTeamSpawn(entities) {
    if (!entities) return
    if (entities.length === 0) return

    let lands = this.landManager.findRandomSuitableLands()

    let request

    if (env === 'test') {
      request = new PositionSearchRequest(this, {row: 96, col: 4 })
    } else {
      request = new PositionSearchRequest(this)
    }

    request.onComplete((x, y) => {
      entities.forEach((entity) => {
        if (entity.isPlayer()) {
          entity.repositionTo(x, y)
          entity.setPositionFound(true)
        } else if (entity.isMob() || entity.isCorpse()) {
          entity.setPosition(x, y)
        }
      })
    })

    request.search(lands)
  }

  removeEventHandlerTriggers() {
    this.eventHandler.clear()
  }

  getSampleCommandBlockJson() {
    return {
      isEnabled: true,
      triggers: [
        {
          id: 1,
          event: "PlayerJoined",
          actions: [
            {
              id: 2,
              actionKey: "commands",
              actionValues: [
                {
                  id: 3,
                  value: "/give {playerId} potato 20"
                }
              ]
            }
          ]
        }
      ]
    }
  }

  getMiniGameObjectives() {
    return MiniGameObjectives
  }

  isEquipmentStorage() {
    return false
  }

  initSettings(entities) {
    let firespread = true;
    if(this.isPeaceful()) firespread = false;
    this.settings = {
      isPvPAllowed: false,
      isFovMode: false,
      isZoomAllowed: true,
      showMiniMap: true,
      showPlayerList: true,
      isMobAutospawn: true,
      isFloorAutodirt: true,
      isStaminaEnabled: true,
      isHungerEnabled: true,
      isOxygenEnabled: true,
      isChatEnabled: true,
      isInfiniteAmmo: false,
      isInfinitePower: false,
      isCorpseEnabled: true,
      isShadowsEnabled: true,
      isPlayerSavingEnabled: true,
      showTeamJoin: false,
      isCraftingEnabled: true,
      isBloodEnabled: true,
      isSuitChangeEnabled: true,
      isDropInventoryOnDeath: false,
      isMutantEnabled: true,
      isGravityEnabled: false,
      isFireSpreadEnabled: firespread,
    }

    if (!entities) return

    for (let name in entities.settings) {
      if (typeof this.settings[name] !== 'undefined') {
        this.settings[name] = entities.settings[name]
      }
    }
  }

  canBeCrafted(type) {
    if (this.isMiniGame()) {
      if (!this.miniGame.canCraftItem(type)) {
        return false
      }
    }

    return true
  }

  hasInfiniteAmmo() {
    return this.settings['isInfiniteAmmo']
  }

  hasInfinitePower() {
    return this.settings['isInfinitePower']
  }

  shouldShowPlayerList() {
    return this.settings["showPlayerList"]
  }

  shouldAllowSuitChanged() {
    return this.settings["isSuitChangeEnabled"]
  }

  shouldMobsAutospawn() {
    return this.settings["isMobAutospawn"]
  }

  isFull() {
    if (this.isMiniGame()) {
      return this.getPlayerCount() > this.miniGame.getMaxPlayers()
    } else {
      return this.getPlayerCount() >= 20
    }
  }

  getPlayerCount() {
    return Object.keys(this.players).length
  }

  shouldFloorsAutodirt() {
    return this.settings["isFloorAutodirt"]
  }

  getRegion(name) {
    return this.regions[name]
  }

  getPath(name) {
    return this.paths[name]
  }

  setPath(name, path) {
    this.paths[name] = path
  }

  removePath(name) {
    delete this.paths[name]
  }

  getButton(name) {
    return this.buttons[name]
  }

  addButton(button) {
    this.buttons[button.name] = button
  }

  removeButton(button) {
    delete this.buttons[button.name]
  }

  onButtonClicked(data) {
    this.game.triggerEvent("ButtonClicked", data)
  }

  renamePath(name, newName) {
    this.paths[newName] = this.paths[name]
    delete this.paths[name]
  }

  initActivityLogs(entities) {
    this.activityLogEntries = {}

    if (!entities) return

    if (entities.activityLogEntries) {
      this.activityLogEntries = entities.activityLogEntries
    }
  }

  initCommandLogs(entities) {
    this.commandLogEntries = {}

    if (!entities) return

    if (entities.commandLogEntries) {
      this.commandLogEntries = entities.commandLogEntries
    }
  }

  initKits(entities) {
    if (!entities) return
    if (entities.kits) {
      for (let kitName in entities.kits) {
        let kitData = entities.kits[kitName]
        this.game.createKit(kitName, { kitData: kitData })
      }
    }
  }

  initDefaultSellables() {
    let itemKlasses = [Ores.Sand, Ores.Wood, Buildings.CoffeeSeed, Buildings.WheatSeed, Buildings.PotatoSeed, Buildings.SunflowerSeed, Buildings.BlueSeed, Buildings.PoppySeed,Buildings.PumpkinSeed,Buildings.RiceSeed, Foods.Starberries, Foods.Fish, Mobs.Chicken, Mobs.Monkey, Mobs.Cat, Mobs.CleanBot, Mobs.Car, Equipments.CombatArmor, Equipments.SantaHat, Equipments.NameTag]
    itemKlasses.forEach((klass) => {
      let group = klass.prototype.isMob() ? "mob" : "item"
      this.sellables[klass.prototype.getTypeName()] = { group: group, type: klass.prototype.getType(), cost: klass.getCost() }
    })
  }

  initRegions(entities) {
    if (!entities) return

    if (entities.regions) {
      for (let regionName in entities.regions) {
        let data = entities.regions[regionName]
        new Region(this, data)
      }
    }
  }

  initButtons(entities) {

  }

  isGameDev() {
    return false
  }

  initEventHandler() {
    this.eventHandler = new EventHandler(this)

    if (!this.isMiniGame()) return

    if (debugMode) {
      if (this.game.origSectorUid === "eWC1CfZymRExY") {
        this.miniGame = new FindTheImposter()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "l8v7ezWMvnGeC") {
        this.miniGame = new BedWars()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "vbj91eofmFCiu") {
        this.miniGame = new TowerDefense()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "BPF0uFha5QLUr") {
        this.miniGame = new Domination()
        this.miniGame.registerHandlers(this.eventHandler)
      }
    } else {
      if (this.game.origSectorUid === "Ap9OYBkw3dQvJ") {
        this.miniGame = new FindTheImposter()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "uLHpXWb2koXYe") {
        this.miniGame = new BedWars()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "YcdqgbswlAqRi") {
        this.miniGame = new TowerDefense()
        this.miniGame.registerHandlers(this.eventHandler)
      }

      if (this.game.origSectorUid === "PnGkJd5xZsb0v") {
        this.miniGame = new Domination()
        this.miniGame.registerHandlers(this.eventHandler)
      }
    }
  }

  isDominationMinigame() {
    return this.game.origSectorUid === "BPF0uFha5QLUr"
  }

  showChatError(message) {
    this.eventHandler.queueLog({ type: 'error', message: message })
  }

  showChatSuccess() {

  }

  initGlobalVariables(entities) {
    if (!entities) return
    this.eventHandler.loadVariables(entities.variables)
  }

  initCustomStats(entities) {
    this.mobCustomStats = {}
    this.buildingCustomStats = {}
    this.entityCustomStats = {}
    this.itemCustomStats = {}

    if (!entities) return

    if (entities.mobCustomStats) {
      this.mobCustomStats = entities.mobCustomStats
    }

    if (entities.buildingCustomStats) {
      this.buildingCustomStats = entities.buildingCustomStats
    }

    if (entities.entityCustomStats) {
      this.entityCustomStats = entities.entityCustomStats
    }

    if (entities.itemCustomStats) {
      this.itemCustomStats = entities.itemCustomStats
    }
  }

  setCustomMobStat(type, stats) {
    this.mobCustomStats[type] = stats
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CustomStats", {
      group: "mobs",
      type: type,
      stats: stats
    })
  }

  setCustomBuildingStat(type, stats) {
    this.buildingCustomStats[type] = stats
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CustomStats", {
      group: "buildings",
      type: type,
      stats: stats
    })
  }

  setCustomItemStat(type, stats) {
    this.itemCustomStats[type] = stats
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CustomStats", {
      group: "items",
      type: type,
      stats: stats
    })
  }

  setCustomEntityStat(id, stats) {
    this.entityCustomStats[id] = stats
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CustomStats", {
      group: "entities",
      type: id,
      stats: stats
    })
  }

  initSellables(entities) {
    this.sellables = {}

    if (!entities) {
      this.initDefaultSellables()
      return
    }

    if (entities.sellables && this.isPeaceful()) {
      for (let typeName in entities.sellables) {
        let sellableData = entities.sellables[typeName]
        let data = { group: sellableData.group, type: sellableData.type, cost: sellableData.cost }
        if (sellableData.itemName) {
          data.itemName = sellableData.itemName
        }
        this.sellables[typeName] = data
      }
    } else {
      this.initDefaultSellables()
    }
  }

  initPurchasables(entities) {
    this.purchasables = {}
    this.isCustomSell = false

    if (!entities) {
      return
    }

    if (entities.purchasables) {
      for (let typeName in entities.purchasables) {
        let data = entities.purchasables[typeName]
        this.purchasables[typeName] = { group: data.group, type: data.type, cost: data.cost }
      }
    }

    if (entities.isCustomSell) {
      this.isCustomSell = entities.isCustomSell
    }
  }

  setPurchasable(klass, cost) {
    let group = klass.prototype.isMob() ? "mob" : "item"
    this.purchasables[klass.prototype.getTypeName()] = { group: group, type: klass.prototype.getType(), cost: cost }

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SellableUpdated", this.getSellableData())
  }

  hasPurchasable(klass) {
    return this.purchasables[klass.prototype.getTypeName()]
  }

  deletePurchasable(klass) {
    delete this.purchasables[klass.prototype.getTypeName()]
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SellableUpdated", this.getSellableData())
  }

  setCustomSell(isCustomSell) {
    this.isCustomSell = isCustomSell
    this.onCustomSellChanged()
  }

  onCustomSellChanged() {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SellableUpdated", this.getSellableData())
  }

  setSellable(klass, cost, itemName) {
    let group = klass.prototype.isMob() ? "mob" : "item"
    this.sellables[klass.prototype.getTypeName()] = { group: group, type: klass.prototype.getType(), cost: cost, itemName: itemName }

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SellableUpdated", this.getSellableData())
  }

  getSellableData() {
    return {
      sellables: this.sellables,
      purchasables: this.purchasables,
      isCustomSell: this.isCustomSell
    }
  }

  hasSellable(klass) {
    return this.sellables[klass.prototype.getTypeName()]
  }

  deleteSellable(klass) {
    delete this.sellables[klass.prototype.getTypeName()]
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SellableUpdated", this.getSellableData())
  }

  getActivityLogs(teamId) {
    let activityLogEntry = this.activityLogEntries[teamId]
    if (!activityLogEntry) return []

    return activityLogEntry.activityLogs
  }

  getCommandLogs(teamId) {
    let commandLogEntry = this.commandLogEntries[teamId]
    if (!commandLogEntry) return []

    return commandLogEntry.commandLogs
  }

  getSetting(key) {
    return this.settings[key]
  }

  editSetting(key, value) {
    if (typeof this.settings[key] !== 'undefined') {
      value = String(value)
      if (value != "true" && value != "false") {
        return;
      }

      if(!this.canEditSetting(key)) return;

      // convert to bool
      if (value === "true") value = true
      if (value === "false") value = false

      this.settings[key] = value
      this.onSettingChanged(key, value)

      this.getSocketUtil().broadcast(this.game.getSocketIds(), "SectorUpdated", {
        settings: this.settings
      })
    }
  }

  canEditSetting(key) {
    if(this.gameMode === 'hardcore' || !this.gameMode) return false;
    if(this.gameMode === 'survival') {
      let allowedSettingChanges = ['isPvPAllowed',"isFovMode", "isZoomAllowed", "showMiniMap", "showPlayerList", "isFloorAutodirt", "isChatEnabled", "isShadowsEnabled", "isPlayerSavingEnabled", "isBloodEnabled", "isGravityEnabled"]

      if(allowedSettingChanges.indexOf(key) === -1) return false;
    }

    return true;
  }

  onSettingChanged(key, value) {
    if (key === 'isZoomAllowed') {
      // handle zoomable for each player..
      this.game.forEachPlayer((player) => {
        player.applyNonZoomScreenDimensions()
      })
    } else if (key === 'isBloodEnabled') {
      if (!this.settings['isBloodEnabled']) {
        this.removeAllBlood()
      }
    }
  }

  removeAllBlood() {
    this.groundMap.forEach((row, col, entity) => {
      if (entity && entity.hasBlood()) {
        entity.setEffectLevel("blood", 0)
      }
    })

    this.platformMap.forEach((row, col, entity) => {
      if (entity && entity.hasBlood()) {
        entity.setEffectLevel("blood", 0)
      }
    })
  }

  setGameMode(gameMode) {
    this.gameMode = gameMode
  }

  isPeaceful() {
    return this.gameMode === 'peaceful'
  }

  canUseCommandBlocks() {
    return this.isPeaceful() || this.isMiniGame()
  }

  disableChunkInvalidations() {
    this.isChunkInvalidationDisabled = true
  }

  enableChunkInvalidations() {
    this.isChunkInvalidationDisabled = false
  }

  isUpvotable() {
    return !this.game.isPvP() && !this.isLobby()
  }

  onFinishedLoading() {
    this.forEachChunk((chunk) => {
      chunk.buildRegions()
    })

    this.enableChunkInvalidations()
    this.game.postGameReady()
  }

  fetchScreenshots() {
    let sectorModel = this.game.sectorModel
    if (sectorModel && sectorModel.screenshot) {
      this.screenshots[sectorModel.screenshot] = 1
    }
  }

  initPrivacy() {
    let sectorModel = this.game.sectorModel
    if (sectorModel) {
      if (!this.isMiniGame()) {
        // minigame has its own privacy status. public by default
        this.isPrivate = sectorModel.isPrivate
      }
    }
  }

  async initFavoriteCount() {
    this.favoriteCount = 0

    let sectorModel = this.game.sectorModel
    if (sectorModel && sectorModel.dataValues.favoriteCount) {
      this.favoriteCount = sectorModel.dataValues.favoriteCount
    }

    this.onFavoriteCountChanged(this.favoriteCount)
  }

  increaseUpvote() {
    this.upvoteCount += 1
    this.onVoteChanged()
  }

  decreaseUpvote() {
    this.upvoteCount -= 1
    this.onVoteChanged()
  }

  increaseDownvote() {
    this.downvoteCount += 1
    this.onVoteChanged()
  }

  decreaseDownvote() {
    this.downvoteCount -= 1
    this.onVoteChanged()
  }

  onVoteChanged() {
    if (this.isMiniGame()) return

    // after 2 second.. sum total upvote/downvote from votes and cache values in sector..
    // prevent autoclicker spam sql
    clearTimeout(this.cacheVoteTimeout)

    this.cacheVoteTimeout = setTimeout(() => {
      this.cacheUpvotes()
    }, 2000)
  }

  async cacheUpvotes() {
    if (this.isMiniGame()) return

    try {
      let result = await Vote.findAll({
        attributes: [
          'sectorUid',
          [sequelize.fn('sum', sequelize.col('upvote')), 'totalUpvoteCount'],
          [sequelize.fn('sum', sequelize.col('downvote')), 'totalDownvoteCount']
        ],
        group : ['sectorUid'],
        raw: true,
        where: { sectorUid: this.getUid() }
      })

      let baseCount = 10
      let upvoteCount   = parseInt(result[0].totalUpvoteCount)
      let downvoteCount = parseInt(result[0].totalDownvoteCount)
      let normalizeUpvoteCount = upvoteCount + baseCount
      let normalizeDownvoteCount = downvoteCount + baseCount

      let rating = Math.round((normalizeUpvoteCount / (normalizeUpvoteCount + normalizeDownvoteCount)) * 100)

      await SectorModel.update({
        upvoteCount: upvoteCount,
        downvoteCount: downvoteCount,
        rating: rating
      }, {
        where: { uid: this.getUid() }
      })
    } catch(e) {
      this.game.captureException(e)
    }
  }

  isMiniGame() {
    return this.game.isMiniGame()
  }

  initVotes() {
    if (this.isMiniGame()) return

    this.upvoteCount = 0
    this.downvoteCount = 0

    let sectorModel = this.game.sectorModel
    if (sectorModel && sectorModel.dataValues.upvoteCount) {
      this.upvoteCount = sectorModel.dataValues.upvoteCount
    }

    if (sectorModel && sectorModel.dataValues.downvoteCount) {
      this.downvoteCount = sectorModel.dataValues.downvoteCount
    }

    this.onFavoriteCountChanged(this.favoriteCount)
  }

  async initBans() {
    this.sectorBans = []
    if (this.isMiniGame() || this.isTutorial()) {
    } else {
      let sectorModel = this.game.sectorModel
      const sectorBans = await SectorBan.findAll({ where: { sectorUid: this.getUid() } })
      sectorModel.sectorBans = sectorBans

      if (sectorModel && sectorModel.sectorBans) {
        this.sectorBans = sectorModel.sectorBans.map((sectorBan) => { return sectorBan.dataValues })
      }
    }
  }

  isTutorial() {
    return this.game.isTutorial
  }

  async fetchSectorBans() {
    if (this.isMiniGame()) return

    this.sectorBans = await SectorBan.findAll({ where: { sectorUid: this.getUid() } })
    this.sectorBans = this.sectorBans.map((sectorBan) => { return sectorBan.dataValues })

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SectorUpdated", {
      sectorBans: this.sectorBans
    })
  }

  async fetchFavoriteCount() {
    let newFavoriteCount = await Favorite.count({
      where: {
        sectorUid: this.getUid()
      }
    })

    if (newFavoriteCount !== this.favoriteCount) {
      this.favoriteCount = newFavoriteCount
      this.onFavoriteCountChanged(this.favoriteCount)
    }
  }

  unregisterEventListeners() {

  }

  isTeam() {
    return false
  }

  getUid() {
    return this.uid
  }

  getRadAngle() {
    return this.angle * (Math.PI / 180)
  }

  getAngle() {
    return this.angle
  }

  initExecutors() {
    this.rebuildInvalidatedChunksHandler = this.rebuildInvalidatedChunks.bind(this)
    this.runRoomManagerHandler = this.runRoomManager.bind(this)
  }

  getCreatorTeam() {
    return this.game.getCreatorTeam()
  }

  getId() {
    return this.id
  }

  getName() {
    return this.name
  }

  getRemoteAddress() {
    return ""
  }

  getBuildOwner() {
    return this.getCreatorTeam()
  }

  setName(name) {
    this.name = name
    this.onNameChanged()
  }

  setIsPrivate(isPrivate) {
    this.isPrivate = isPrivate
    this.onIsPrivateChanged()
  }

  onNameChanged() {
    this.game.sendSectorInfoToMatchmaker()
  }

  onIsPrivateChanged() {
    this.game.sendSectorInfoToMatchmaker()
    if (this.miniGame) {
      this.miniGame.onIsPrivateChanged(this.isPrivate)
    }
  }

  initOtherGrids() {
    this.groundMap   = new Grid("ground",    this, this.getRowCount(), this.getColCount())
    this.homeArea = new HomeArea(this)
  }

  getStandingPlatform(row, col) {
    let entity = this.platformMap.get(row, col)
    if (entity) return entity

    entity = this.groundMap.get(row, col)
    if (entity) return entity

    return null
  }

  getStandingPlatformFromBounds(boundingBox) {
    let entity
    let entities = this.platformMap.search(boundingBox)
    entity = entities[0]
    if (entity) return entity

    entities = this.groundMap.search(boundingBox)
    entity = entities[0]
    if (entity) return entity

    return null
  }

  initMobManager() {
    this.mobManager = new MobManager(this)
  }

  initFovManager() {
    this.fovManager = new FovManager(this)
  }

  getLightTile(row, col) {
    return { entity: this.pathFinder.getTile(row, col) }
  }

  initLandManager() {
    this.landManager = new LandManager(this)
  }

  initPoolManager() {
    this.poolManager = new PoolManager(this)
  }

  initSectorLoader() {
    this.sectorLoader = new SectorLoader(this)
  }

  isInHomeArea(row, col) {
    return this.homeArea.isInHomeArea(row, col)
  }

  getCoordFromGridPos(rowOrCol) {
    return rowOrCol * Constants.tileSize + Constants.tileSize / 2
  }

  getLand(row, col) {
    return this.landManager.getLand(row, col)
  }

  getPool(row, col) {
    return this.poolManager.getPool(row, col)
  }

  isShip() {
    return false
  }

  isInventory() {
    return true
  }

  isPlayer() {
    return false
  }

  isMob() {
    return false
  }

  isCorpse() {
    return false
  }

  progressTutorial() {
    // do nothing

  }

  getAlliance() {
    return this
  }

  removeAllBuildings(row, col) {
    let maps = [this.platformMap, this.structureMap, this.distributionMap, this.armorMap, this.fuelDistributionMap, this.gasDistributionMap, this.liquidDistributionMap]
    for (var i = 0; i < maps.length; i++) {
      let map = maps[i]
      let tile = map.get(row, col)
      if (tile) {
        tile.remove()
      }
    }
  }


  addClaim(entity, claimer) {
    new Claim(this, entity, claimer, this.game.timestamp)
  }

  hasClaim(entity) {
    return this.claims[entity.id]
  }

  removeClaim(entity) {
    let claim = this.claims[entity.id]
    if (claim) {
      claim.remove()
    }
  }

  expireClaims() {
    const isOneMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let id in this.claims) {
      let claim = this.claims[id]
      if (claim.isExpired()) {
        claim.remove()
      }
    }
  }

  getAllChunkRegions() {
    let chunkRegions = []
    this.forEachChunk((chunk) => {
      chunkRegions = chunkRegions.concat(chunk.getChunkRegionList())
    })

    return chunkRegions
  }

  isSector() {
    return true
  }

  initChunk(row, col) {
    let chunk = new Chunk(this, row, col)
    return chunk
  }

  initChunks() {
    const numOfTilesInRow  = this.getColCount()
    const numOfChunksInRow = numOfTilesInRow / Constants.chunkRowCount

    this.chunkMap = new ChunkGrid("chunk_map", this, numOfChunksInRow, numOfChunksInRow, this.initChunk.bind(this))

    this.chunkRegions = {}

    this.changedRoomsForPlayer = {}
    this.changedChunks = {}
    this.fullChunkRequests = {}
  }



  forEachChunk(cb) {
    this.chunkMap.forEach((row, col, chunk) => {
      cb(chunk)
    })
  }

  addChangedChunks(chunk) {
    this.changedChunks[chunk.id] = chunk
  }

  clearChangedChunks() {
    this.changedChunks = {}
  }

  addChangedPlayers(player) {
    this.changedPlayers[player.id] = player
  }

  clearChangedPlayers(player) {
    this.changedPlayers = {}
  }

  registerBuildingDecay(building) {
    this.buildingDecays.add(building.getId())
  }

  unregisterBuildingDecay(building) {
    this.buildingDecays.delete(building.getId())
  }

  removeDecayedBuildings() {
    const isTwoMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60 * 2) === 0
    if (!isTwoMinuteInterval) return

    this.buildingDecays.forEach((buildingId) => {
      let building = this.game.getEntity(buildingId)
      if (!building) {
        this.buildingDecays.delete(buildingId)
      } else {
        let isBuildingRemoved = this.removeBuildingIfFullyDecayed(building)
        if (isBuildingRemoved) {
          this.buildingDecays.delete(buildingId)
        }
      }
    })
  }

  removeBuildingIfFullyDecayed(building) {
    try {
      let decayDuration = this.game.timestamp - building.decayStartTimestamp
      let decayThreshold = Constants.physicsTimeStep * Constants.decayThresholdInSeconds
      if (decayDuration > decayThreshold) {
        building.remove()
        return true
      }
    } catch(e) {
      this.game.captureException(e)
      return false
    }
  }

  registerEating(data) {
    this.eating[data.entity.id] = data
  }

  unregisterEating(entityId) {
    delete this.eating[entityId]
  }

  processEating() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep) === 0
    if (!isOneSecondInterval) return

    try {
      for (let entityId in this.eating) {
        let data = this.eating[entityId]
        if (data.progress >= 5) {
          this.unregisterEating(entityId)
          data.finished(data.food, data.entity)
        } else {
          data.progress += 1
        }
      }
    } catch(e) {
      this.game.captureException(e)
    }
  }

  registerSleeping(data) {
    this.sleeping[data.entity.id] = data
  }

  unregisterSleeping(entityId) {
    delete this.sleeping[entityId]
  }

  processSleeping() {
    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0
    if (!isFiveSecondInterval) return

    try {
      for (let entityId in this.sleeping) {
        let data = this.sleeping[entityId]
        if (data.entity.stamina >= data.entity.getMaxStamina()) {
          this.unregisterSleeping(entityId)
          data.finished(data.entity)
        } else {
          data.entity.setStamina(data.entity.stamina + 3)
        }
      }
    } catch(e) {
      this.game.captureException(e)
    }
  }

  addChangedRoomsForPlayer(player) {
    this.changedRoomsForPlayer[player.id] = player
  }

  clearChangedRoomsForPlayer() {
    this.changedRoomsForPlayer = {}
  }

  getChunk(row, col) {
    return this.chunkMap.get(row, col)
  }

  getChunkRegionAt(row, col) {
    let chunkRow = Math.floor(row / Constants.chunkRowCount)
    let chunkCol = Math.floor(col / Constants.chunkColCount)

    let chunk = this.getChunk(chunkRow, chunkCol)
    if (chunk) {
      return chunk.getChunkRegion(row, col)
    }
  }

  getChunkRegionsAt(row, col) {
    let chunkRow = Math.floor(row / Constants.chunkRowCount)
    let chunkCol = Math.floor(col / Constants.chunkColCount)

    let chunk = this.getChunk(chunkRow, chunkCol)
    if (chunk) {
      return chunk.getChunkRegionsAtRowCol(row, col)
    }
  }

  createItem(type, options = {}) {
    return new Item(this, type, options)
  }

  createPickup(data) {
    return new Pickup(this, data)
  }

  createProjectile(type, options = {}) {
    if (!options.weapon && !options.owner) {
      options.owner = this
    }
    return Projectiles[type].build(options)
  }

  hasReachedProjectileLimit() {
    return Object.keys(this.projectiles).length >= Constants.maxProjectilesPerSector
  }

  addFire(row, col) {
    const entity = this.platformMap.get(row, col)
    if (entity) {
      entity.addFire()
    }
  }

  sendFullChunks() {
    for (let playerId in this.fullChunkRequests) {

      // send
      let player = this.players[playerId]
      if (!player) {
        // player might have disconnected at this point
        delete this.fullChunkRequests[playerId]
        continue
      }

      if (!player.getChunk()) {
        // player not in a chunk. invalid
        delete this.fullChunkRequests[playerId]
        continue
      }

      let chunkRequests = this.fullChunkRequests[playerId]

      // send middle chunk first since thats what player sees right away
      let playerChunkId = player.getChunk().getId()
      let centerChunk = chunkRequests[playerChunkId]
      delete chunkRequests[playerChunkId]
      if (centerChunk) {
        centerChunk.sendAllToClient(player)
      }

      for (let chunkId in chunkRequests) {
        let chunk = chunkRequests[chunkId]
        chunk.sendAllToClient(player)
      }

      // clear cache
      delete this.fullChunkRequests[playerId]
    }

  }

  sendChangedChunks() {
    for (let key in this.changedChunks) {
      let chunk = this.changedChunks[key]
      chunk.sendChangedEntities()
    }

    this.clearChangedChunks()
  }

  isFovMode() {
    return this.settings.isFovMode
  }

  isZoomAllowed() {
    if (this.game.isPvP()) return false
    return this.settings.isZoomAllowed
  }

  isSectorOwner() {
    return true
  }

  sendChangedPlayers() {
    if (!this.isFovMode()) return

    for (let key in this.changedPlayers) {
      let player = this.changedPlayers[key]
      player.sendChangedPlayersToClient()
      player.sendChangedCorpsesToClient()
    }

    this.clearChangedPlayers()
  }

  sendChangeRoomsForPlayer() {
    let changedRoomsPresent = false

    for (let id in this.changedRoomsForPlayer) {
      let player = this.changedRoomsForPlayer[id]
      player.sendChangedRooms()
      changedRoomsPresent = true
    }

    if (changedRoomsPresent) {
      this.clearChangedRoomsForPlayer()
    }
  }

  sendHomeArea() {
    this.homeArea.sendChangedTiles()
  }

  onHourChanged(hour) {
    let prevDay = this.day
    this.day = this.getDayCount()
    if (this.day !== prevDay) {
      this.onDayCountChanged()
    }

    this.resetDirtCount()
  }

  async onDayCountChanged() {
    this.game.incrementTeamsDayCount()
    this.resetVendingMachinePurchaseHistory()

    this.updateSectorModelDayCount()
  }

  async updateSectorModelDayCount() {
    if (this.isMiniGame()) return

    let sectorModel = await SectorModel.findOne({
      where: { uid: this.getUid() }
    })

    if (sectorModel) {
      await sectorModel.update({ daysAlive: this.getDayCount() })
    }
  }

  onDayNightChanged() {
  }

  resetVendingMachinePurchaseHistory() {
    for (let id in this.structures) {
      let structure = this.structures[id]
      if (structure.hasCategory("vending_machine")) {
        structure.resetPurchaseHistory()
      }
    }
  }

  createDrop(options) {
    Pickup.createDrop(options)
  }

  getMobKlassForType(type) {
    return Mobs.forType(type)
  }

  initRoomManager() {
    this.roomManager = new RoomManager(this)
    this.roomManager.setGrids([this.structureMap, this.armorMap, this.platformMap, this.groundMap])
    this.roomManager.setPlatformGrids([this.platformMap, this.groundMap])
    this.roomManager.setOnRoomCreateSuccessListener(this)
  }

  onRoomCreateSuccess(room) {

  }

  getTerrainsByChunk(chunk) {
    let maps = [this.groundMap]
    let terrains = []

    maps.forEach((map) => {
      map.forEachMultiple(chunk.tileStartRow, chunk.tileStartCol, chunk.tileEndRow, chunk.tileEndCol, (row, col, entity) => {
        if (entity) {
          terrains.push(entity)
        }
      })
    })

    return terrains
  }

  getBuildingsByChunk(chunk) {
    let tree = this.getTreeFromEntityType("buildings", this)
    return tree.search(chunk.getBoundingBox())
  }

  getPickupsByChunk(chunk) {
    let tree = this.getTreeFromEntityType("pickups", this)
    return tree.search(chunk.getBoundingBox())
  }

  getMobsByChunk(chunk) {
    let tree = this.getTreeFromEntityType("mobs", this)
    return tree.search(chunk.getBoundingBox())
  }

  getProjectilesByChunk(chunk) {
    let tree = this.getTreeFromEntityType("projectiles", this)
    return tree.search(chunk.getBoundingBox())
  }

  getPlayersByChunk(chunk) {
    let tree = this.getTreeFromEntityType("players", this)
    return tree.search(chunk.getBoundingBox())
  }

  getRoomsByChunk(chunk) {
    let tree = this.getTreeFromEntityType("rooms", this)
    return tree.search(chunk.getBoundingBox())
  }

  getCorpsesByChunk(chunk) {
    let hits = this.unitMap.hitTestTileCollection(chunk.getBox())
    let corpses = hits.filter((hit) => {
      return hit.entity
    }).map((hit) => {
      return hit.entity
    })

    return corpses
  }

  getCorpsesByBox(box) {
    let hits = this.unitMap.hitTestTileCollection(box)
    let corpses = hits.filter((hit) => {
      return hit.entity
    }).map((hit) => {
      return hit.entity
    })

    return corpses
  }

  initPathFinder() {
    this.pathFinder = new PathFinder(this)
  }

  initOxygenManager() {
    this.oxygenManager = new OxygenManager(this)
    this.oxygenManager.setGrids([this.structureMap, this.gasDistributionMap])
  }

  initLiquidManager() {
    this.liquidManager = new LiquidManager(this)
    this.liquidManager.setGrids([this.structureMap, this.liquidDistributionMap])
  }

  initFuelManager() {
    this.fuelManager = new FuelManager(this)
    this.fuelManager.setGrids([this.structureMap, this.fuelDistributionMap])
  }

  initVoteManager() {
    this.voteManager = new VoteManager(this)
  }

  addVote(player, data) {
    this.voteManager.addVote({
      sourcePlayerId: player.getId(),
      targetPlayerId: data.targetPlayerId
    })
  }

  addScene() {

  }

  initPressureManager() {
    this.pressureManager = new PressureManager(this)
  }

  initPowerManager() {
    this.powerManager = new PowerManager(this)
    this.powerManager.setGrids([this.structureMap, this.distributionMap])
  }

  initRailManager() {
    this.railManager = new RailManager(this)
  }

  initSoilManager() {
    this.soilManager = new SoilManager(this)
  }

  placeBuilding(data) {
    if (typeof data.type === "string") {
      data.type = Buildings[data.type].getType()
    }

    this.convertLegacyType(data)

    let buildingKlass = Buildings.forType(data.type)
    if (!buildingKlass) return null

    let building = buildingKlass.build(data, this)
    if (building.dontBuild) return null

    return building
  }

  convertLegacyType(data) {
    if (data.type === Protocol.definition().BuildingType.WoodFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.brown_1.index
      data.textureIndex = Constants.FloorTextures.layered_bar_texture.index
    } else if (data.type === Protocol.definition().BuildingType.SteelFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.white_1.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.BlueFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.blue_2.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.GreenFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.green_5.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.PurpleFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.purple_1.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.YellowFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.yellow_2.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.BronzeFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.brown_2.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.GrayFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.grey_1.index
      data.textureIndex = Constants.FloorTextures.solid_texture.index
    } else if (data.type === Protocol.definition().BuildingType.PinkFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.red_1.index
      data.textureIndex = Constants.FloorTextures.cornered_texture.index
    } else if (data.type === Protocol.definition().BuildingType.PlatedFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.green_3.index
      data.textureIndex = Constants.FloorTextures.plated_texture.index
    } else if (data.type === Protocol.definition().BuildingType.StripePlatedFloor) {
      data.type = Protocol.definition().BuildingType.Floor
      data.colorIndex = Constants.FloorColors.green_3.index
      data.textureIndex = Constants.FloorTextures.striped_texture.index
    }
  }

  isLobby() {
    return false
  }

  getOwner() {
    return Object.values(this.players)[0]
  }

  setBuildSpeed(buildSpeed) {
    if (isNaN(buildSpeed)) return
    if (buildSpeed < 1 || buildSpeed > 5) return

    this.buildSpeed = buildSpeed

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "SectorUpdated", {
      buildSpeed: this.buildSpeed
    })
  }

  setMiningSpeed(miningSpeed) {
    if (isNaN(miningSpeed)) return
    if (miningSpeed < 1 || miningSpeed > 5) return

    this.miningSpeed = miningSpeed
  }

  initVariables() {
    this.jumpPower = 128
    this.gravity = 10
    this.buildSpeed = 1
    this.miningSpeed = 1
    this.hostileMobCount = 0
    this.neutralMobCount = 0
    this.paths = {}
    this.buttons = {}
    this.commandBlockTimers = {}
    this.goldStatsToSync = {}
    this.sidebarToSync = {}
    this.cameraFeeds = {}
    this.spawnPoints = {}
    this.undergroundVents = {}
    this.objectives = {}
    this.changedPlayers = {}
    this.permissions = {}
    this.loadSectorStep = 0
    this.eating = {}
    this.sleeping = {}
    this.chunkRegionToContinentMap = {}
    this.terminalMessages = []
    this.screenshots = {}
    this.dirtCountForHour = 0
    this.MAX_SEARCH_SPAWN_COUNT = 50

    this.treeList = ["playerTree", "mobTree", "projectileTree", "buildingTree",
                     "shipBuildingTree", "unitTree", "terrainTree",
                     "pickupTree", "regionTree", "shipTree", "roomTree"]

    /*
      see Chunk#sendChangedProjectilesToClients
    */
    this.sentEntityByPlayer = {}
    this.terrains = {}
    this.hangars = {}
    this.pendingStores = {}
    this.pendingBuildings = {}
    this.pendingDrainables = {}
    this.buildingDecays = new Set()

    this.players = {}
    this.ships = {} // actual ships
    this.transports = {}  // transportation
    this.units = {}
    this.projectiles = {}
    this.mobs = {}
    this.plants = {}
    this.waters = {}
    this.troubleshooters = {}
    this.claims = {}
    this.continents = {}

    this.waves = {}

    this.lastPlayerPosition = { x: 200, y: 500 }
    this.angle = 0

  }

  addCameraFeed(camera) {
    this.cameraFeeds[camera.id] = camera
    this.onCameraFeedsChanged()
  }

  removeCameraFeed(camera) {
    delete this.cameraFeeds[camera.id]
    this.onCameraFeedsChanged()
  }

  onCameraFeedsChanged() {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CameraFeedUpdated", { cameraFeeds: this.cameraFeeds })
  }

  getOccupancyPercentage() {
    let mapTileCount = this.getRowCount() * this.getColCount()
    let ratio = this.homeArea.getTileCount() / (mapTileCount / 2)
    return Math.min(100,Math.floor(ratio * 100))
  }

  addTerminalMessage(user, msg) {
    if (this.terminalMessages.length >= 200) {
      this.terminalMessages.shift()
    }

    let text = user.name + ": " + msg
    this.terminalMessages.push(text)

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "TerminalUpdated", { message: text })
  }

  incrementDirtCount() {
    this.dirtCountForHour += 1
  }

  resetDirtCount() {
    this.dirtCountForHour = 0
  }

  addTransport(transport) {
    this.transports[transport.getId()] = transport
  }

  removeTransport(transport) {
    delete this.transports[transport.getId()]
  }

  addTroubleshooter(player) {
    this.troubleshooters[player.getId()] = player
  }

  removeTroubleshooter(player) {
    delete this.troubleshooters[player.getId()]
  }

  createTrees() {
    this.treeList.forEach((treeName) => {
      this[treeName] = rbush()
      this[treeName].name = treeName
    })
  }

  getTreeFromEntityType(entityType, container) {
    this.trees  = this.trees || {
      "terrains": this.terrainTree,
      "players": this.playerTree,
      "mobs": this.mobTree,
      "projectiles": this.projectileTree,
      "units": this.unitTree,
      "ships": this.shipTree,
      "buildings": this.buildingTree,
      "pickups": this.pickupTree,
      "rooms": this.roomTree,
      "regions": this.regionTree
    }

    if (container && container.isShip() && entityType === "buildings") {
      return this.sector.shipBuildingTree
    }

    return this.trees[entityType]
  }


  isPlatformBoundary(hit) {
    return !hit.entity // if its not platform, its considered a boundary
  }

  isGroundBoundary(hit) {
    return (hit.entity && hit.entity.isObstacle()) || this.isOutOfBounds(hit.row, hit.col)
  }

  setOwner(player) {
    this.owner = player
  }

  getSocketIds() {
    let ids = []

    for (let id in this.players) {
      let player = this.players[id]
      ids.push(player.getSocketId())
    }

    return ids
  }

  isMovable() {
    return false
  }

  cleanup() {
    this.treeList.forEach((treeName) => {
      this[treeName].clear()
    })

    this.mobTaskQueue.reset()
  }

  addSpawnPoint(key, beacon) {
    this.spawnPoints[key] = this.spawnPoints[key] || {}
    this.spawnPoints[key][beacon.getCoord()] = { x: beacon.getX(), y: beacon.getY() }
  }

  removeSpawnPoint(key, beacon) {
    this.spawnPoints[key] = this.spawnPoints[key] || {}
    delete this.spawnPoints[key][beacon.getCoord()]
  }

  addUndergroundVent(vent) {
    this.undergroundVents[vent.id] = vent
  }

  removeUndergroundVent(vent) {
    delete this.undergroundVents[vent.id]
  }

  getAvailableSpawnPosGround(w, h, searchCount = 0) {
    let ground = this.findRandomGround()

    let left = ground.getX() - Math.floor(w / 2)
    let top  = ground.getY() - Math.floor(h / 2)
    let centerX = ground.getX()
    let centerY = ground.getY()

    // shift appropriately so that tiles would fit on square blocks
    let isWidthEven = (w / Constants.tileSize) % 2  === 0
    let isHeightEven = (w / Constants.tileSize) % 2  === 0

    if (isWidthEven) {
      left = left - Constants.tileSize/2
      centerX = centerX - Constants.tileSize/2
    }

    if (isHeightEven) {
      top = top - Constants.tileSize/2
      centerY = centerY - Constants.tileSize/2
    }

    const box = {
      pos: {
        x: left,
        y: top
      },
      w: w,
      h: h
    }

    let grids = [this.platformMap, this.structureMap, this.distributionMap, this.armorMap]

    if (this.isNotPlacable(box, grids)) {
      searchCount += 1
      if (searchCount > this.MAX_SEARCH_SPAWN_COUNT) {
        return null
      } else {
        return this.getAvailableSpawnPosGround(w, h, searchCount)
      }
    } else {
      return { x: centerX, y: centerY, left: box.pos.x, top: box.pos.y }
    }

  }

  getAvailableSpawnPos(w, h, isSnapped, grids, searchCount = 0) {
    let randomX = this.randomSpawnPos()
    let randomY = this.randomSpawnPos()
    let left
    let top

    if (isSnapped) {
      randomX = Math.floor(randomX / Constants.tileSize) * Constants.tileSize + (Constants.tileSize / 2)
      randomY = Math.floor(randomY / Constants.tileSize) * Constants.tileSize + (Constants.tileSize / 2)

      left = this.normalizeSpawnPos(randomX - w/2)
      top  = this.normalizeSpawnPos(randomY - h/2)

      left = Math.floor(left / Constants.tileSize) * Constants.tileSize
      top  = Math.floor(top / Constants.tileSize) * Constants.tileSize
    }


    const box = {
      pos: {
        x: left,
        y: top
      },
      w: w,
      h: h
    }

    if (this.isNotPlacable(box, grids)) {
      searchCount += 1
      if (searchCount > this.MAX_SEARCH_SPAWN_COUNT) {
        return null
      } else {
        return this.getAvailableSpawnPos(w, h, isSnapped, grids, searchCount)
      }
    } else {
      return { x: randomX, y: randomY, left: box.pos.x, top: box.pos.y }
    }
  }

  isNotPlacable(box, grids) {
    let result = false
    let excludeOutOfBounds = false

    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let hits = grid.hitTestTile(box, null, excludeOutOfBounds)
      let isEntityPresentOrOutOfBounds = hits.find((hit) => { return hit.entity !== 0 || hit.entity === null })
      if (isEntityPresentOrOutOfBounds) {
        result = true
        break
      }
    }

    return result

  }

  randomSpawnPos() {
    let x = Math.floor(Math.random() * this.getSectorWidth())
    return this.normalizeSpawnPos(x)
  }

  normalizeSpawnPos(s, padding, mapSize) {
    return this.normalizePosition(s, padding, mapSize)
  }

  normalizePosition(s, padding = 50, mapSize = this.getSectorWidth()) {
    if (s - padding < 0) {
      s = padding
    } else if (s + padding > mapSize) {
      s = mapSize - padding
    }
    return s
  }

  setOwnershipOfStructures(player) {
    this.setOwner(player)

    this.forEachBuilding((building) => {
      building.setOwner(player)
    })
  }

  forEachBuilding(cb) {
    const buildings = this.getBuildingGroups()
    buildings.forEach((group) => {
      for (let entityId in group) {
        let entity = group[entityId]
        cb(entity)
      }
    })
  }

  getBuildingGroups() {
    return [this.platforms, this.armors, this.distributions, this.crops, this.structures, this.units]
  }

  applyBlueprint(blueprintData) {
    if (!blueprintData) return

    (new Blueprint(blueprintData)).applyTo(this)
  }

  safeCreateTeam(data) {
    try {
      new Team(this, data)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeCreatePlayerData(data) {
    try {
      new PlayerData(this, data)
    } catch(e) {
      LOG.error(e)
      this.game.captureException(e)
    }
  }

  safeCreatePickup(data) {
    try {
      let itemData = data.item

      let item = this.createItem(itemData.type, itemData)

      data.item = item

      new Pickup(this, data)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeCreateCorpse(data) {
    try {
      if (Protocol.definition().MobType[data.type]) {
        // must be valid mob type
        new Corpse(this, data)
      }
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeCreateMob(data) {
    try {
      if (data.type === 15) return // ghost
      let mobKlass = Mobs.forType(data.type)
      new mobKlass(this, data)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeCreateTransport(data) {
    try {
      let transportKlass = Transports.forType(data.type)
      new transportKlass(this, data)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  determineRaidState() {
    this.game.eventManager.forEachRaid((raid) => {
      raid.determineRaidState()
    })
  }

  addPendingStore(buildingId, index, entityData) {
    this.sectorLoader.addPendingStore(buildingId, index, entityData)
  }

  removeForegrounds(blueprintData, topLeftX, topLeftY, width, height) {
    let padding = Constants.tileSize
    let x = topLeftX + Math.floor(width / 2)
    let y = topLeftY + Math.floor(height / 2)
    let box = this.getBlueprintBox(x, y, width, height, padding)

    // destroy foregrounds
    let groundHits = this.groundMap.hitTestTile(box)
    groundHits.forEach((hit) => {
      if (hit.entity && hit.entity.isForegroundTile()) {
        hit.entity.remove()
      }
    })
  }

  findOrCreateContinent(targetChunkRegion) {
    let continent = this.getContinent(targetChunkRegion)

    if (!continent) {
      continent = this.createContinent(targetChunkRegion)
    }

    return continent
  }

  getContinent(targetChunkRegion) {
    let continent = this.chunkRegionToContinentMap[targetChunkRegion.getId()]
    if (continent) {
      return continent
    }

    let result = null

    for (let id in this.continents) {
      let continent = this.continents[id]
      if (continent.hasChunkRegion(targetChunkRegion)) {
        result = continent
        break
      }
    }

    return result
  }

  createContinent(targetChunkRegion) {
    let continent = new Continent(this)
    let traversal = this.traverseChunkRegionsUntil(targetChunkRegion,
       { all: true, passThroughWall: true } ,
       (chunkRegion) => {
      return chunkRegion.isSky !== targetChunkRegion.isSky
    })

    for (let chunkRegionId in traversal.visited) {
      let chunkRegion = traversal.visited[chunkRegionId]
      continent.addChunkRegion(chunkRegion)
    }

    for (let chunkRegionId in traversal.edges) {
      let chunkRegion = traversal.edges[chunkRegionId]
      continent.addEdge(chunkRegion)
    }

    continent.markExits()

    return continent
  }

  traverseChunkRegionsUntil(targetChunkRegion, neighborOptions, condition) {
    let result = {}

    let visited = {}
    let edges = {}

    let frontier = [targetChunkRegion]
    visited[targetChunkRegion.getId()] = targetChunkRegion

    let chunkRegion

    while (frontier.length > 0) {
      chunkRegion = frontier.shift()

      let chunkRegionNeighbors = chunkRegion.getNeighbors(neighborOptions)
      chunkRegionNeighbors.forEach((chunkRegionNeighbor) => {
        let shouldNotProceed = condition(chunkRegionNeighbor)
        if (shouldNotProceed) {
          edges[chunkRegion.getId()] = chunkRegion
        } else {
          if (!visited[chunkRegionNeighbor.getId()]) {
            frontier.push(chunkRegionNeighbor)
            visited[chunkRegionNeighbor.getId()] = chunkRegionNeighbor
          }
        }
      })
    }

    return { visited: visited, edges: edges }
  }

  findOneChunkRegionUntil(targetChunkRegion, options = {}) {
    if (!targetChunkRegion) return null

    let frontier = [targetChunkRegion]
    let visited = {}
    visited[targetChunkRegion.getId()] = targetChunkRegion

    let chunkRegion
    let desiredChunkRegion = null

    let hops = 1

    while (frontier.length > 0 && !desiredChunkRegion) {
      chunkRegion = frontier.shift()
      let isConditionFullfilled = options.breakCondition(chunkRegion)
      if (isConditionFullfilled) {
        desiredChunkRegion = chunkRegion
      }

      let chunkRegionNeighbors = chunkRegion.getNeighbors({ sameBiome: true, passThroughWall: false })
      let shouldStopNeighborTraversal = desiredChunkRegion ||
                                        options.neighborStopCondition(chunkRegion, hops)

      for (var i = 0; !shouldStopNeighborTraversal && i < chunkRegionNeighbors.length; i++) {
        let chunkRegionNeighbor = chunkRegionNeighbors[i]

        if (!visited[chunkRegionNeighbor.getId()]) {
          frontier.push(chunkRegionNeighbor)
          visited[chunkRegionNeighbor.getId()] = chunkRegionNeighbor
        }
      }

      hops += 1
    }

    return desiredChunkRegion
  }


  safePlaceBuilding(data) {
    try {
      return this.placeBuilding(data)
    } catch(e) {
      this.game.captureException(e)
      return null
    }
  }

  getBlueprintBox(x, y, w, h, padding) {
    return {
      pos: {
        x: x - w/2,
        y: y - h/2,
      },
      w: w + padding * 2,
      h: h + padding * 2
    }
  }


  getStarterBasePosition() {
    let waterKeys = Object.keys(this.waters)
    let index = Math.floor(Math.random() * waterKeys.length)
    let randomWaterTile = waterKeys[index]


  }

  getMineable(row, col) {
    let entity = this.groundMap.get(row, col)
    if (entity && entity.isMineable()) {
      return entity
    } else {
      return null
    }
  }

  getStarterBaseBlueprintData() {
    return require("./../../" + Constants.ShipDesignDirectory + "building_1.json")
  }

  initMap(entities) {
    this.mapGenerator = new MapGenerator(this, this.groundMap)

    if (!entities || (entities && !entities.terrains)) {
      this.mapGenerator.regenerate()
    }
  }

  getShipBlueprintData() {
    // return { colCount: 15, rowCount: 20, components: {} }
    return require("./../../" + Constants.ShipDesignDirectory + "trader_ship.json")
    // return require("./../../" + Constants.ShipDesignDirectory + "starter_sv.json")
  }

  findRandomGround() {
    return this.mapGenerator.findRandomGround()
  }

  getRandomRoom() {
    const rooms = Object.values(this.roomManager.rooms)
    const index =  Math.floor(Math.random() * rooms.length)
    return rooms[index]
  }

  createRock(row, col) {
    new Terrains.Rock(this, row, col)
  }

  createTerrain(klassName, row, col) {
    let klass = Terrains[klassName]
    new klass(this, row, col)
  }

  createChaserEvent() {

  }

  getRoom(row, col) {
    let result

    let hit = { row: row, col: col }

    for (let id in this.roomManager.rooms) {
      let room = this.roomManager.rooms[id]
      if (room.hasTile(hit)) {
        result = room
        break
      }
    }

    return result
  }


  createFireEvent(options) {
    let player = options.player
    let room = player.getStandingPlatform().room
    if (!room) return

    let tile = room.getRandomTile()
    if (tile) {
      this.addFire(tile.getRow(), tile.getCol())
    }
  }

  getHourDuration(timestampDuration) {
    const hoursPerSecond = 1/Constants.secondsPerHour
    const secondsPerTick = 1/Constants.physicsTimeStep

    return Math.floor(timestampDuration * secondsPerTick * hoursPerSecond)
  }

  getDays(timestampDuration) {
    const hoursPerDay = 24

    // 24 hours should become 25, so that result would be 2 days
    let hourDuration = this.getHourDuration(timestampDuration) + 1
    return Math.ceil(hourDuration / hoursPerDay)
  }

  getDayCount() {
    return this.getDays(this.game.timestamp)
  }

  getHour() {
    return this.game.hour
  }

  getHours(timestampDuration) {
    return this.getHourDuration(timestampDuration)
  }

  findOxygenTanks() {
    return Object.values(this.roomManager.rooms).map((room) => {
      return Object.values(room.oxygenStorages)
    }).flat().map((hit) => {
      return hit.entity
    })
  }

  findStructures(structureName) {
    let type = Protocol.definition().BuildingType[structureName]
    if (!type) return []

    return Object.values(this.structures).filter((structure) => {
      return structure.getType() === type
    })
  }

  hasCategory() {
    return false
  }

  getValidDocking(doors) {
    let result = null

    for (var i = 0; i < doors.length; i++) {
      let door = doors[i]

      let dockWidth  = 6  * Constants.tileSize
      let dockHeight = 10 * Constants.tileSize
      let dockingBoundingBox = door.getDockingBoundingBox(dockWidth, dockHeight)
      if (dockingBoundingBox) {
        let collidableResources = this.terrainTree.search(dockingBoundingBox)
        let collidableBuildings = this.buildingTree.search(dockingBoundingBox).filter((entity) => {
          return !entity.hasCategory("platform") && !entity.hasCategory("distribution")
        })

        if (collidableResources.length === 0 || collidableBuildings.length === 0) {
          result = {
            door: door,
            box: dockingBoundingBox
          }
          break
        }
      }
    }

    return result
  }

  createTraderEvent(options) {
    this.game.eventManager.createTraderFor(options.player.getTeam())
  }

  createSpiderEvent(options) {
    let team = options.player.getTeam()
    let room = Object.values(team.rooms)[0]
    options.room = room
    this.game.eventManager.createSpiderInfestation(team, options)
  }

  createMeteorEvent(options) {
    let team = options.player.getTeam()
    this.game.eventManager.scheduleMeteorShower(team, options)
  }

  getTeam() {
    return this.getCreatorTeam()
  }

  spawnShip(options) {
    const type = options.type
    const caller = options.player
    const x = options.x || caller.getX() + caller.getRandomOffset(Constants.tileSize * 5)
    const y = options.y || caller.getY() + caller.getRandomOffset(Constants.tileSize * 5)

    let blueprintData = this.getBlueprintDataForType(type)
    if (blueprintData) {
      let blueprint = new Blueprint(blueprintData)
      new Ship(this, { x: x, y: y }, { blueprint: blueprint })
    }
  }

  setBuildingTreeInsertDisable(shouldDisableBuildingTreeInsert) {
    this.shouldDisableBuildingTreeInsert = shouldDisableBuildingTreeInsert
  }

  getBlueprintDataForType(type) {
    let data
    let shipTypes = ["ftl_ship", "starter_sv", "trader_ship"]
    if (shipTypes.indexOf(type) === -1) return null

    return require("./../../" + Constants.ShipDesignDirectory + type + ".json")
  }

  spawnPet(options) {
    const klassName = this.klassifySnakeCase(options.type) || "Spider"
    const caller = options.player
    const x = options.x || caller.getX() + caller.getRandomOffset(Constants.tileSize * 2)
    const y = options.y || caller.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    const count = options.count || 1
    const mobKlass = Mobs[klassName]
    if (!mobKlass) {
      return caller.showChatError("No such pet: " + options.type)
    }

    let spawnable = new mobKlass(this, { x: x, y: y })

    spawnable.setMaster(caller)
    spawnable.setOwner(caller.getTeam())
    spawnable.makeObedient()

    return spawnable
  }

  setTime(hour) {
    const hoursPerSecond = 1/Constants.secondsPerHour
    const secondsPerTick = 1/Constants.physicsTimeStep

    // we change the actual game timestamp
    let hourDifference = hour.hour - this.game.hour
    if (hourDifference < 0) hourDifference = 24 + hourDifference // bef: 22, aft: 0 (difference should be 2)

    let ticksToAdvance = (hourDifference / hoursPerSecond) / secondsPerTick

    this.game.timestamp += ticksToAdvance

    this.game.calculateHour()
  }

  warp(options) {
    const caller = options.player
    const entityToTeleport = options.entityToTeleport
    const x = options.x
    const y = options.y
    if (x < 0 || y < 0 || x > this.getSectorWidth() || y > this.getSectorHeight()) {
      return caller.showChatError("invalid position")
    }

    if (options.opts === 'room') {
      let row = Math.floor(y / Constants.tileSize)
      let col = Math.floor(x / Constants.tileSize)
      let room = this.getRoom(row, col)
      let platform = room.getRandomUnoccupiedPlatform()
      entityToTeleport.warp(platform.getX(), platform.getY())
    } else if (typeof entityToTeleport.setPosition === 'function') {
      entityToTeleport.warp(x, y)
    }
  }

  klassifySnakeCase(str) {
    if (!str) return ""
    str = Helper.camelCase(str)
    str = Helper.capitalize(str)
    return str
  }

  emitSocket(eventName, data) {
    this.forEachPlayer((player) => {
      player.emitSocket(eventName, data)
    })
  }

  forEachMobsByTypeName(typeName, cb) {
    for (let mobId in this.mobs) {
      let mob = this.mobs[mobId]
      if (mob.getTypeName() === typeName) {
        cb(mob)
      }
    }
  }

  spawnItem(options) {
    const klassName = this.klassifySnakeCase(options.type)
    const caller = options.player

    const count = options.count || 1

    if (!Item.getKlassByName(klassName)) {
      return caller.showChatError("invalid item")
    }

    try {
      const item = new Item(this, klassName, { count: count })
      if (!item.isStackableType()) {
        item.setCount(1)
      }

      if (item.hasInstance() && item.instance.isDrainable() && item.instance.shouldBeFullOnSpawn()) {
        item.instance.setUsage(item.instance.getUsageCapacity())
      }

      const x = options.x
      const y = options.y

      new Pickup(this, { x: x, y: y, item: item })
    } catch (e) {
      if (e instanceof Item.InvalidBuildingTypeError) {
        caller.showChatError("No such item " + options.type)
      } else {
        throw e
      }
    }
  }

  setRegionVisible(isRegionVisible) {
    this.forEachPlayer((player) => {
      player.setRegionVisible(isRegionVisible)
    })
  }

  toggleRegionVisible() {
    this.forEachPlayer((player) => {
      player.toggleRegionVisible()
    })
  }

  spawnCorpse(options) {
    const klassName = this.klassifySnakeCase(options.type) || "Spider"
    if (!Mobs[klassName]) return

    const corpseType = Mobs[klassName].getType()
    const caller = options.player

    let x = options.x
    let y = options.y

    if (this.getCorpseCount() > 200) {
      return
    }

    if (caller && caller.isPlayer()) {
      x = options.x || caller.getX() + caller.getRandomOffset(Constants.tileSize * 2)
      y = options.y || caller.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    } else {
      let firstPlayer = this.getFirstPlayer()
      x = options.x || firstPlayer.getX() + caller.getRandomOffset(Constants.tileSize * 2)
      y = options.y || firstPlayer.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    new Corpse(this, { x: x, y: y, type: corpseType, name: options.name })
  }

  getCorpseCount() {
    return Object.keys(this.corpses).length
  }

  getFirstPlayer() {
    return Object.values(this.players)[0]
  }

  spawnProjectile(options) {
    const klassName = this.klassifySnakeCase(options.type)
    const caller = options.caller
    let x = options.x
    let y = options.y

    const klass = Projectiles[klassName]
    if (!klass) {
      caller.showChatError("No such projectile: " + options.type)
      return false
    }

    options.owner = this
    options.source = { x: x, y: y}
    options.destination = { x: x, y: y}
    klass.build(options)
  }

  canDamage() {
    return true
  }

  getRandomOffset(size) {
    return size - Math.floor(Math.random() * size * 2)
  }

  spawnMob(options) {
    const klassName = this.klassifySnakeCase(options.type) || "Spider"
    const caller = options.player
    let count = options.count || 1
    if (count > 50 ) count = 50

    if (caller && caller.isPlayer()) {
      options.x = options.x || caller.getX() + caller.getRandomOffset(Constants.tileSize * 2)
      options.y = options.y || caller.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    } else {
      let firstPlayer = this.getFirstPlayer()
      options.x = options.x || firstPlayer.getX() + caller.getRandomOffset(Constants.tileSize * 2)
      options.y = options.y || firstPlayer.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    const mobKlass = Mobs[klassName]
    const goalTargets = options.goals || []
    const path = options.path || []
    const isNeutral = options.isNeutral
    const raid = options.raid

    if (!mobKlass) {
      caller.showChatError("No such mobtype: " + options.type)
      return []
    }

    if (mobKlass.prototype.hasCategory('worker') && caller && caller.isPlayer()) {
      if (caller.getTeam().isSlaveLimitReached(count)) {
        caller.showError("Slave Limit Reached")
        return []
      }
    }

    if (mobKlass.prototype.hasCategory('bot') && caller && caller.isPlayer()) {
      if (caller.getTeam().isBotLimitReached(count)) {
        caller.showError("Bot Limit Reached")
        return []
      }
    }

    let mobs = []
    for (let i = 0; i < count; i++) {
      if (this.isMobLimitExceeded() && !options.ignoreLimits) {
        break
      }

      let mob = new mobKlass(this, options)
      mobs.push(mob)

      goalTargets.forEach((goalTarget) => {
        mob.addGoalTarget(goalTarget)
      })

      for (var j = path.length - 1; j >= 0; j--) {
        let rowCol = path[j]
        let row = rowCol.split("-")[0]
        let col = rowCol.split("-")[1]
        let tile = this.pathFinder.getTile(row, col)
        if (tile) {
          mob.addGoalTarget(tile)
        }
      }
    }

    return mobs
  }

  isMobLimitExceeded() {
    return this.getMobCount() > this.getMaxMobCount()
  }

  getMobCount() {
    return Object.keys(this.mobs).length
  }

  getMaxMobCount() {
    return this.isMiniGame() ? 150 : 50
  }

  spawnMobAtShip(x, y, targetPlayer) {
    let spawnable = new Mobs.Spider(this, { x: x, y: y })

    if (targetPlayer.ship) {
      targetPlayer.ship.addMob(spawnable)
      const platform = targetPlayer.ship.getRandomUnoccupiedPlatform()
      spawnable.relativePosition[0] = platform.getRelativeX()
      spawnable.relativePosition[1] = platform.getRelativeY()
      spawnable.ship = targetPlayer.ship // boardShip
    }
  }

  getGridRulerTopLeft() {
    const gridTopLeft = {
      x: 0,
      y: 0
    }

    return gridTopLeft
  }

  populateSpatialTreeFor(collectionMap, tree) {
    for (let entityId in collectionMap) {
      let entity = collectionMap[entityId]
      this.insertEntityToTree(entity, tree)
    }
  }

  insertEntityToTreeByName(entity, groupName) {
    if(entity.isRemoved && entity.isRemoved()) return
    let tree = this.getTreeFromEntityType(groupName, entity.getContainer())
    entity.updateRbushCoords()
    entity.onWorldPostStep()

    if (!this.isInvalidBoundingBox(entity)) {
      tree.insert(entity)
    }
  }

  isInvalidBoundingBox(entity) {
    return isNaN(entity.minX) || isNaN(entity.maxX) || isNaN(entity.minY) || isNaN(entity.maxY)
  }

  removeEntityFromTreeByName(entity, groupName) {
    let tree = this.getTreeFromEntityType(groupName, entity.getContainer())

    if (!this.isInvalidBoundingBox(entity)) {
      tree.remove(entity)
    }
  }

  insertEntityToTree(entity, tree) {
    entity.updateRbushCoords()
    entity.onWorldPostStep()

    if (!this.isInvalidBoundingBox(entity)) {
      tree.insert(entity)
    }
  }

  getWaveForPlayer(player) {
    if (!this.waves[player.id]) {
      this.waves[player.id] = new Wave(this.game, player)
    }

    return this.waves[player.id]
  }

  // wraps everything in try catch
  // so that an entity processing failure would not stop
  // entire sector processing chain
  safeExecuteTurn(entity) {
    try {
      entity.executeTurn()
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeConstructBuilding(queue) {
    try {
      let building = queue[0]
      if (building) {
        building.constructBuilding()
        if (building.isConstructionFinished()) {
          queue.shift()
        }
      }
    } catch(e) {
      this.game.captureException(e)
    }
  }

  addPendingBuilding(owner, building) {
    this.pendingBuildings[owner.getId()] = this.pendingBuildings[owner.getId()] || []
    this.pendingBuildings[owner.getId()].push(building)
  }

  addPendingDrainable(entity) {
    this.pendingDrainables[entity.getId()] = entity
  }

  safeProcessDrainable(entity) {
    try {
      entity.checkDrainableUsage()
      delete this.pendingDrainables[entity.getId()]
    } catch(e) {
      this.game.captureException(e)
    }
  }

  onItemCountChanged(item) {

  }

  safeExecute(cb) {
    try {
      cb()
    } catch(e) {
      this.game.captureException(e)
    }
  }

  safeGrowFire(entity) {
    try {
      entity.growFire()
    } catch(e) {
      this.game.captureException(e)
    }
  }

  regrowCrops() {
    let fiberPlantCount = Object.values(this.crops).filter((crop) => {
      let isFiberSeed = crop.getType() === Protocol.definition().BuildingType.FiberSeed
      if (!isFiberSeed) return false

      let platform = crop.getStandingPlatform()

      return platform && platform.isGroundTile()
    }).length

    let minimumFiberPlantCount = this.getRowCount()
    let numFiberPlantToCreate = Math.max(0, minimumFiberPlantCount - fiberPlantCount)

    let plantedCount = 0
    this.landManager.forEachRandomLand((land) => {
      if (plantedCount < numFiberPlantToCreate) {
        let plantedCountInLand = 0
        land.getUnoccupiedTiles((coord) => {
          let rowCol = Helper.getRowColFromCoord(coord)
          let row = rowCol[0]
          let col = rowCol[1]
          let tile = this.getStandingPlatform(row, col)
          if (tile && tile.isGroundTile()) {
            let data = {
              x: rowCol[1] * Constants.tileSize + Constants.tileSize/2,
              y: rowCol[0] * Constants.tileSize + Constants.tileSize/2
            }
            new Buildings.FiberSeed(data, this)
            plantedCount += 1
            plantedCountInLand += 1

            let shouldContinue = plantedCountInLand < 4
            return shouldContinue
          }
        })
      }
    })
  }

  getFlameCount() {
    return Object.keys(this.flames).length
  }

  addFlame(entity) {
    this.flames[entity.getId()] = entity
    this.game.triggerEvent("FlameAdded", { row: entity.getRow(), col: entity.getCol() })
  }

  removeFlame(entity) {
    delete this.flames[entity.getId()]
    this.game.triggerEvent("FlameRemoved", { row: entity.getRow(), col: entity.getCol() })
  }

  executeTurn() {
    this.eventHandler.resetProcessingEvents()

    for (let entityId in this.flames) {
      let entity = this.flames[entityId]
      if(!entity.effects.fire || entity.isRemoved) {
        delete this.flames[entityId]
        return;
      } 
      this.safeGrowFire(entity)
    }

    for (let waveId in this.waves) {
      let wave = this.waves[waveId]
      this.safeExecuteTurn(wave)
    }

    for (let mobId in this.mobs) {
      let mob = this.mobs[mobId]
      this.safeExecuteTurn(mob)
    }

    for (let shipId in this.ships) {
      let ship = this.ships[shipId]
      this.safeExecuteTurn(ship) }

    for (let buildingId in this.towers) {
      let building = this.towers[buildingId]
      this.safeExecuteTurn(building)
    }

    for (let unitId in this.units) {
      let unit = this.units[unitId]
      this.safeExecuteTurn(unit)
    }

    for (let cropId in this.crops) {
      let crop = this.crops[cropId]
      this.safeExecuteTurn(crop)
    }

    for (let id in this.breakings) {
      let breaking = this.breakings[id]
      this.safeExecute(() => {
        breaking.incrementRestoreCounter()
        breaking.reduceBreak()
      })
    }

    for (let ownerId in this.pendingBuildings) {
      let queue = this.pendingBuildings[ownerId]
      this.safeConstructBuilding(queue)
    }

    for (let processorId in this.processors) {
      let processor = this.processors[processorId]
      this.safeExecuteTurn(processor)
    }

    for (let id in this.powerManager.networks) {
      let network = this.powerManager.networks[id]
      this.safeExecuteTurn(network)
    }

    this.safeExecuteTurn(this.floodFillQueue)
    this.safeExecuteTurn(this.pathFinder)

    this.safeExecute(this.rebuildInvalidatedChunksHandler)
    this.safeExecute(this.runRoomManagerHandler)

    for (let entityId in this.pendingDrainables) {
      let entity = this.pendingDrainables[entityId]
      this.safeProcessDrainable(entity)
    }

    this.processGoldSyncBuffer()
    this.processSidebarSyncBuffer()
    this.processEating()
    this.processSleeping()
    this.cleanupPickups()
    this.cleanupCorpses()
    this.processMiasma()
    this.updateTeamScoreboard()

    this.expireClaims()
    this.removeDecayedBuildings()

    if (this.game.activeScene) {
      this.safeExecuteTurn(this.game.activeScene)
    }

    this.eventHandler.flushLogs()
  }

  cleanupPickups() {
    const isOneMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let id in this.pickups) {
      let pickup = this.pickups[id]
      try {
        if (pickup.shouldDecay()) {
          pickup.remove()
        }
      } catch(e) {
        this.game.captureException(e)
      }
    }
  }

  processMiasma() {
    if (this.game.isPeaceful()) return

    const isOneMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let id in this.corpses) {
      let corpse = this.corpses[id]
      if (corpse.isRotten()) {
        corpse.addMiasma()
      }
    }
  }

  bufferClientGoldUpdate(player) {
    this.goldStatsToSync[player.id] = true
  }

  bufferSidebarText(playerId, data) {
    this.sidebarToSync[playerId] = this.sidebarToSync[playerId] || {}
    this.sidebarToSync[playerId][data.row] = data
  }

  processGoldSyncBuffer() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep) === 0
    if (!isOneSecondInterval) return

    for (let playerId in this.goldStatsToSync) {
      let player = this.players[playerId]
      if (player) {
        player.syncGoldAmountToClient()
      }
      delete this.goldStatsToSync[playerId]
    }
  }

  processSidebarSyncBuffer() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep) === 0
    if (!isOneSecondInterval) return

    for (let playerId in this.sidebarToSync) {
      for (let row in this.sidebarToSync[playerId]) {
        let sidebarData = this.sidebarToSync[playerId][row]
        let player = this.players[playerId]
        if (player) {
          this.game.setSidebarText(player.getId(), sidebarData)
        } else if (playerId === '0') {
          // global sidebar
          this.game.setSidebarText(0, sidebarData)
        }
      }
      delete this.sidebarToSync[playerId]
    }
  }

  cleanupCorpses() {
    if (this.game.isPeaceful() || this.game.isMiniGame()) return

    const isOneMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let id in this.corpses) {
      let corpse = this.corpses[id]
      try {
        if (corpse.shouldDecay()) {
          corpse.remove()
        }
      } catch(e) {
        this.game.captureException(e)
      }
    }
  }

  forEachCorpse(cb) {
    for (let id in this.corpses) {
      cb(this.corpses[id])
    }
  }

  forEachPickup(cb) {
    for (let id in this.pickups) {
      cb(this.pickups[id])
    }
  }

  async replaceScreenshot(data, player) {
    if (global.isOffline) return

    for (let id in this.screenshots) {
      await this.removeScreenshot(id, player)
    }

    return this.addScreenshot(data, player)
  }

  async addScreenshot(data, player) {
    if (global.isOffline) return
    if (this.isMiniGame()) return

    let imageData = data.imageData
    let position = data.position || 0

    // save to DB
    let sectorModel = await SectorModel.findOne({
      where: { uid: this.getUid() }
    })
    if (!sectorModel) return

    let token = uuidv4().replace(/-/g,'')

    let thumbnailPath = this.getScreenshotThumbnailPath(token)

    let image = Buffer.from(imageData, 'base64')
    let thumbnail = await this.createImageThumbnail(image)

    let isThumbnailSuccessful = await this.game.uploadImage(thumbnailPath, thumbnail)
    if (isThumbnailSuccessful) {
      this.screenshots[token] = position

      sectorModel.screenshot = token
      await sectorModel.save()

      this.onScreenshotsChanged()
      return token
    }

    return null
  }

  async removeScreenshot(screenshotId, player) {
    if (this.isMiniGame()) return

    let sectorModel = await SectorModel.findOne({
      where: { uid: this.getUid() }
    })
    sectorModel.screenshot = null
    await sectorModel.save()

    let thumbnailPath = this.getScreenshotThumbnailPath(screenshotId)

    await this.game.deleteImage(thumbnailPath)

    delete this.screenshots[screenshotId]
    this.onScreenshotsChanged()
  }

  onScreenshotsChanged() {
    this.game.sendSectorInfoToMatchmaker()
  }

  onFavoriteCountChanged(favoriteCount) {
  }

  getMaxActivityLogLength() {
    return 1000
  }

  getMaxCommandLogLength() {
    return 300
  }

  printActivityLog(teamId) {
    let activityLogEntry = this.activityLogEntries[teamId]
    if (!activityLogEntry) return console.log("Invalid team for activityLog")

    let activityLogs = activityLogEntry.activityLogs

    for (var i = 0; i < activityLogs.length; i++) {
      let activityLog = activityLogs[i]
      let formatted = `[${(new Date(activityLog.timestamp)).toISOString()}] ${activityLog.username} deconstructed ${Protocol.definition().BuildingType[activityLog.entityType]} ${activityLog.entityId} owned by ${activityLog.owner && activityLog.owner.name} @ (${activityLog.row},${activityLog.col})`
      console.log(formatted)
    }
  }

  removeActivityLogEntries(teamId) {
    delete this.activityLogEntries[teamId]
  }

  addActivityLog(options) {
    if (options.owner && options.owner.isTeam()) {
      let teamId = options.owner.id
      delete options["owner"]
      if (!this.activityLogEntries[teamId]) {
        this.activityLogEntries[teamId] = { activityLogs: [] }
      }

      let activityLogs = this.activityLogEntries[teamId].activityLogs

      if (activityLogs.length > this.getMaxActivityLogLength()) {
        activityLogs.shift()
      }

      options.timestamp = Date.now()
      activityLogs.push(options)
    }
  }

  addCommandLog(options) {
    if (options.owner && options.owner.isTeam()) {
      let teamId = options.owner.id
      delete options["owner"]
      if (!this.commandLogEntries[teamId]) {
        this.commandLogEntries[teamId] = { commandLogs: [] }
      }

      let commandLogs = this.commandLogEntries[teamId].commandLogs

      if (commandLogs.length > this.getMaxCommandLogLength()) {
        commandLogs.shift()
      }

      options.timestamp = Date.now()
      commandLogs.push(options)
    }
  }

  async createImageThumbnail(image) {
    let buffer = await Sharp(image).resize(300, 240).toBuffer()
    return buffer
  }

  getScreenshotSavePath(key) {
    if (env === "staging" || env === "production") {
      return "screenshots/" + key + ".jpg"
    } else {
      return "screenshots/development/" + key + ".jpg"
    }
  }

  getScreenshotThumbnailPath(key) {
    if (env === "staging" || env === "production") {
      return "screenshots/" + key + "_thumb.jpg"
    } else {
      return key + "_thumb.jpg"
    }
  }

  runRoomManager() {
    this.roomManager.processPartitionRequestQueue()
    this.roomManager.updateRoomTree()
    this.roomManager.executeTurn()
  }

  rebuildInvalidatedChunks() {
    this.pathFinder.rebuildInvalidatedChunks()
  }

  addPlayer(player) {
    this.players[player.id] = player
    player.sector = this

    this.onPlayerJoin(player)
  }

  addFullChunkRequest(chunk, player) {
    this.fullChunkRequests[player.id] = this.fullChunkRequests[player.id] || {}
    this.fullChunkRequests[player.id][chunk.id] = chunk
  }

  onPlayerJoin(player) {

  }

  getLandPassableTileTypes() {
    return Buildings.getPassableTileTypes().concat(Terrains.getPassableTileTypes)
  }

  getRandomRow(options = {}) {
    let padding = options.padding

    let row = Math.floor(Math.random() * this.getRowCount()) + padding
    if (row > (this.getRowCount() - padding)) {
      row = this.getRowCount() - padding
    }

    return row
  }

  getRandomCol(options = {}) {
    let padding = options.padding

    let col = Math.floor(Math.random() * this.getColCount()) + padding
    if (col > (this.getColCount() - padding)) {
      col = this.getColCount() - padding
    }

    return col
  }

  removeShip(ship) {
    delete this.ships[ship.id]

    ship.remove()
  }

  giveToStorage(storage, type, count) {
    if (storage.isFullyStored()) return

    let options = {}
    if (count && Item.isStackableType(type)) {
      options.count = count
      const item = this.createItem(type, options)
      if (item.hasInstance() && item.instance.isDrainable() && item.instance.shouldBeFullOnSpawn()) {
        item.instance.setUsage(item.instance.getUsageCapacity())
      }
      storage.store(item)
    } else {
      let maxCount = storage.getEmptySpaceCount()
      let createCount = Math.min(count, maxCount)

      for (var i = 0; i < createCount; i++) {
        const item = this.createItem(type, options)
        if (item.hasInstance() && item.instance.isDrainable() && item.instance.shouldBeFullOnSpawn()) {
          item.instance.setUsage(item.instance.getUsageCapacity())
        }
        storage.store(item)
      }
    }

  }

  removePlayer(player) {
    delete this.players[player.id]
    this.onPlayerRemoved(player)
  }

  onPlayerRemoved(player) {
  }

  addUnit(unit) {
    this.units[unit.id] = unit
  }

  getPlayerAttackables() {
    return [this.mobTree, this.buildingTree, this.playerTree, this.distributionMap]
  }

  displaceUnit(unit) {
    delete this.units[unit.id]
  }

  removeUnit(unit) {
    this.displaceUnit(unit)

    unit.remove()
  }

  addMob(mob) {
    this.mobs[mob.id] = mob
    if (mob.status === Protocol.definition().MobStatus.Hostile) {
      this.hostileMobCount++
    } else {
      this.neutralMobCount++
    }
  }

  getHostileMobCount() {
    let count = 0

    for (let id in this.mobs) {
      let mob = this.mobs[id]
      if (mob.status === Protocol.definition().MobStatus.Hostile) {
        count += 1
      }
    }

    return count
  }

  removeMob(mob) {
    delete this.mobs[mob.id]
    if (mob.status === Protocol.definition().MobStatus.Hostile) {
      this.hostileMobCount--
    } else {
      this.neutralMobCount--
    }
  }

  canStoreAt() {
    return true
  }

  forEachNonPlayerMobs(cb) {
    for (let id in this.mobs) {
      let mob = this.mobs[id]
      if (!mob.hasOwner()) {
        cb(mob)
      }
    }
  }

  forEachPlayerMobs(cb) {
    for (let id in this.mobs) {
      let mob = this.mobs[id]
      if (mob.hasOwner()) {
        cb(mob)
      }
    }
  }

  removeAllMobs() {
    for (let mobId in this.mobs) {
      let mob = this.mobs[mobId]
      mob.remove()
    }
  }

  forEachPlayer(cb) {
    for (let id in this.players) {
      cb(this.players[id])
    }
  }

  removeProjectile(projectile) {
    delete this.projectiles[projectile.id]
  }

  addProjectile(projectile) {
    this.projectiles[projectile.id] = projectile
  }

  removeHitscanProjectiles() {
    for (let projectileId in this.projectiles) {
      let projectile = this.projectiles[projectileId]
      if (projectile.shouldRemoveImmediately()) {
        projectile.markForRemoval()
      }
    }
  }

  getX() {
    return 0
  }

  getY() {
    return 0
  }

  getStorageLength() {
    return 500000
  }

  getSectorWidth() {
    return this.getColCount() * Constants.tileSize
  }

  getSectorHeight() {
    return this.getRowCount() * Constants.tileSize
  }

}

Object.assign(Sector.prototype, Owner.prototype, {
})

Object.assign(Sector.prototype, Container.prototype, {
  getCollidableGrids() {
    return [this.armorMap, this.structureMap, this.groundMap]
  },
  getPathFindableGrids() {
    return [this.structureMap, this.armorMap, this.platformMap, this.groundMap]
  },
  getRowCount() {
    return this.colCount
  },
  getColCount() {
    return this.colCount
  }
})

module.exports = Sector
