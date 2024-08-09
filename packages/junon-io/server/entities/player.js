const p2 = require("p2")
const vec2 = p2.vec2
const ExceptionReporter = require('junon-common/exception_reporter')
const Constants = require('../../common/constants.json')
const PlayerCommon = require('../../common/entities/player_common')
const Destroyable = require('../../common/interfaces/destroyable')
const Upgradable = require('../../common/interfaces/upgradable')
const LOG = require('junon-common/logger')
const Movable = require('../../common/interfaces/movable')
const Taintable = require('../../common/interfaces/taintable')
const ShipMountable = require('../../common/interfaces/ship_mountable')
const Owner = require('../../common/interfaces/owner')
const Needs = require('../../common/interfaces/needs')
const Protocol = require('../../common/util/protocol')
const Helper = require('../../common/helper')
const BaseEntity = require('./base_entity')
const Buildings = require("./buildings/index")
const Terrains = require("./terrains/index")
const Wave = require("./wave")
const rbush = require("rbush")
const Blueprint = require("./blueprint")
const Ship = require("./ship")
const Projectiles = require("./projectiles/index")
const Equipments = require("./equipments/index")
const Item = require("./item")
const Pickup = require("./pickup")
const Camera = require("./camera")
const Inventory = require("./inventory")
const Mobs = require("./mobs/index")
const HangarRegion = require("./hangar_region")
const EquipmentInventory = require("./equipment_inventory")
const BadWordsFilter = require("../util/bad_words_filter")
const Chunk = require("./chunk")
const _ = require('lodash')
const SAT = require("sat")
const Team = require("./team")
const uuidv4 = require('uuid/v4')
const EntityGroup = require("./entity_group")
const EventBus = require('eventbusjs')
const PlayerData = require('./player_data')
const TradeOrder = require("./trade_order")
const User = require("junon-common/db/user")
const SectorModel = require("junon-common/db/sector")
const Favorite = require("junon-common/db/favorite")
const Vote = require("junon-common/db/vote")
const NeedsServer = require('./../interfaces/needs')
const Dragger = require('./../interfaces/dragger')
const WalkthroughManager = require("./walkthrough_manager")
const xss = require("xss")

class Player extends BaseEntity {

  constructor(socket, data, sector) {
    super(sector, { id: data.id, x: data.x, y: data.y, w: Constants.Player.width, h: Constants.Player.height })

    this.homeSector = sector
    this.socket = socket
    this.locale = data.locale || "en"
    this.sessionId = socket.sessionId
    this.remoteAddress = Helper.getSocketRemoteAddress(socket)
    this.fingerprint = data.fingerprint

    if (this.sector.isZoomAllowed()) {
      this.screenWidth = this.socket.screenWidth
      this.screenHeight = this.socket.screenHeight
    } else {
      this.applyNonZoomScreenDimensions()
    }

    this.walkthroughManager = new WalkthroughManager(this)

    this.initPlayerCommon()
    this.initContants()
    this.initVariables()

    this.initTaintable({ shouldPopulate: true })
    this.initDestroyable()
    this.initMovable()
    this.initOwner()
    this.initDragger()

    this.initClientState()
    this.initEquipment()
    this.initInventory()
    this.initNeeds()
    this.registerEventListeners()

    this.applyData(data)

    this.register()

    this.replacePhysicalGoldWithVirtual()
  }

  canEditCommandBlock() {
    if (this.sector.isLobby()) return true
    if (!this.sector.canUseCommandBlocks()) return false
    if(this.isSectorOwner()) return true
    if(this.getRole().isAllowedTo("EditCommandBlocks")) return true

    return false
  }

  applyNonZoomScreenDimensions() {
    this.screenWidth  = Constants.tileSize * 40
    this.screenHeight = Constants.tileSize * 24
  }

  async queryBalance() {
    if (!this.isLoggedIn()) return
    if (!this.game.isMiniGame()) return

    let user = await User.findOne({ where: { uid: this.uid } })
    if (!user) return

    let accountBalance = user.gold || 0
    this.getSocketUtil().emit(this.socket, "AccountBalance", { balance: accountBalance })
  }

  onStorageChanged(storage) {

  }

  async toggleUpvote(sectorId) {
    if (!this.isLoggedIn()) return

    clearTimeout(this.voteTimeout)

    this.voteTimeout = setTimeout(() => {
      this.performToggleUpvote(sectorId)
    }, 1000)
  }

  async hasUpvoted() {
    let voteRecord = await Vote.findOne({ where: { sectorUid: this.game.getSectorUid(), userUid: this.getUid() }})
    return voteRecord && voteRecord.upvote === 1
  }

  async performToggleUpvote(sectorId) {
    if (this.game.isMiniGame()) return

    if (this.sector.getUid() === sectorId) {
      if (this.sector.isLobby()) return
      if (this.sector.game.isCreatedByAnonynmous()) return
    }

    let isRemoved = false

    let voteRecord = await Vote.findOne({ where: { sectorUid: sectorId, userUid: this.getUid() }})
    if (voteRecord) {
      if (voteRecord.upvote === 1) {
        await voteRecord.update({ upvote: 0 })
        this.sector.decreaseUpvote()
        isRemoved = true

        this.game.triggerEvent("ColonyUnlike", {
          player: this.name
        })
      } else if (voteRecord.downvote === 1) {
        await voteRecord.update({ downvote: 0, upvote: 1 })
        this.sector.decreaseDownvote()
        this.sector.increaseUpvote()

        this.game.triggerEvent("ColonyLike", {
          player: this.name
        })
      } else {
        await voteRecord.update({ upvote: 1 })
        this.sector.increaseUpvote()
        this.game.triggerEvent("ColonyLike", {
          player: this.name
        })
      }
    } else {
      let sectorModel = await SectorModel.findOne({ where: { uid: sectorId }})
      if (sectorModel) {
        await Vote.createOne({ userUid: this.getUid(), sectorUid: sectorId, upvote: 1 })
        this.sector.increaseUpvote()
        this.game.triggerEvent("ColonyLike", {
          player: this.name
        })
      }
    }

    if (this.sector.getUid() === sectorId) {
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "FavoriteUpdated", {
        upvoteCount: this.sector.upvoteCount,
        userUid: this.getUid(),
        isRemoved: isRemoved
      })
    }
  }

  async toggleDownvote(sectorId) {
    if (!this.isLoggedIn()) return

    clearTimeout(this.voteTimeout)

    this.voteTimeout = setTimeout(() => {
      this.performToggleDownvote(sectorId)
    }, 1000)
  }

  async performToggleDownvote(sectorId) {
    if (this.game.isMiniGame()) return

    if (this.sector.getUid() === sectorId) {
      if (this.sector.isLobby()) return
      if (this.sector.game.isCreatedByAnonynmous()) return
    }

    let voteRecord = await Vote.findOne({ where: { sectorUid: sectorId, userUid: this.getUid() }})
    if (voteRecord) {
      if (voteRecord.downvote === 1) {
        await voteRecord.update({ downvote: 0 })
        this.sector.decreaseDownvote()
      } else if (voteRecord.upvote === 1) {
        await voteRecord.update({ upvote: 0, downvote: 1 })
        this.sector.decreaseUpvote()
        this.sector.increaseDownvote()
      } else {
        await voteRecord.update({ downvote: 1 })
        this.sector.increaseDownvote()
      }
    } else {
      let sectorModel = await SectorModel.findOne({ where: { uid: sectorId }})
      if (sectorModel) {
        await Vote.createOne({ userUid: this.getUid(), sectorUid: sectorId, downvote: 1 })
        this.sector.increaseDownvote()
      }
    }

    if (this.sector.getUid() === sectorId) {
      // this.getSocketUtil().broadcast(this.game.getSocketIds(), "SectorUpdated", {
      //   upvoteCount: this.sector.upvoteCount,
      //   downvoteCount: this.sector.downvoteCount
      // })
    }
  }


  async toggleFavorite(sectorId) {
    if (!this.isLoggedIn()) return

    clearTimeout(this.favoriteTimeout)
    this.favoriteTimeout = setTimeout(() => {
      this.performToggleFavorite(sectorId)
    }, 1000)
  }

  async performToggleFavorite(sectorId) {
    if (this.game.isMiniGame()) return

    if (this.sector.getUid() === sectorId) {
      if (this.sector.isLobby()) return
      if (this.sector.game.isCreatedByAnonynmous()) return
    }

    let isRemoved = false

    let favorite = await Favorite.findOne({ where: { sectorUid: sectorId, userUid: this.getUid() }})
    if (favorite) {
      await favorite.destroy()
      isRemoved = true
    } else {
      let sectorModel = await SectorModel.findOne({ where: { uid: sectorId }})
      if (sectorModel) {
        await Favorite.createOne({ userUid: this.getUid(), sectorUid: sectorId })
      }
    }

    if (this.sector.getUid() === sectorId) {
      await this.sector.fetchFavoriteCount()
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "FavoriteUpdated", {
        favoriteCount: this.sector.favoriteCount,
        userUid: this.getUid(),
        isRemoved: isRemoved
      })
    }
  }

  getRemoteAddress() {
    return this.remoteAddress
  }

  setUid(uid) {
    this.uid = uid
  }

  getUid() {
    return this.uid
  }

  emitSocket(eventName, data) {
    this.getSocketUtil().emit(this.getSocket(), eventName, data)
  }

  setRegionVisible(isRegionVisible) {
    this.isRegionVisible = isRegionVisible
  }

  toggleRegionVisible() {
    this.isRegionVisible = !this.isRegionVisible
  }

  isLoggedIn() {
    return !!this.isAuthenticated
  }

  isAnonymous() {
    return !this.isLoggedIn()
  }

  setRepairTarget(repairTarget) {
    this.repairTarget = repairTarget
  }

  removeRepairTarget() {
    this.repairTarget = null
  }

  getSessionId() {
    return this.sessionId
  }

  assignObjective(objective) {
    this.objectives[objective.name] = objective

    this.getSocketUtil().emit(this.socket, "Objective", { name: objective.name, description: objective.description, translations: objective.translations })
  }

  unassignObjectives() {
    for (let name in this.objectives) {
      let objective = this.objectives[name]
      objective.remove()
    }
  }

  applyData(data) {
    this.resumeTime = Date.now()

    this.joinTimestamp = this.game.timestamp

    if (data.name) {
      this.name = data.name
    } else {
      this.name = this.sanitize(data.username)
    }

    if (data.uid) {
      this.uid = data.uid
      this.idToken = data.idToken
    } else {
      this.uid = uuidv4()
    }

    this.score = data.score || 0

    // kuroro
    if (this.isGameDev()) {
      if (this.name === 'kuroro') {
        this.isAdminMode = true
      }
    } else if (this.isMod()) {
      this.isAdminMode = true
    }


    this.isAuthenticated = data.isAuthenticated

    if (data.hasOwnProperty("health"))  this.health = data.health
    if (data.hasOwnProperty("hunger"))  this.hunger = data.hunger
    if (data.hasOwnProperty("stamina")) this.stamina = data.stamina
    if (data.hasOwnProperty("oxygen"))  this.oxygen = data.oxygen

    if (data.hasOwnProperty("x")) {
      this.spawnPosition = { x: data.x, y: data.y }
    }

    if (data.equipIndex) {
      this.equipIndex = data.equipIndex
    }

    if (data.gold) {
      this.setGold(data.gold)
    } else {
      this.setGold(0)
    }

    this.aliveDurationInTicks = 0

    this.daysAlive = 1

    let hasTeamReference = data.team && data.team.constructor.name === "TeamRef"
    let hasTeam = data.team

    if (hasTeamReference) {
      let team = this.game.getEntity(data.team.id)
      if (team && team instanceof Team) {
        this.team = team
        this.team.addMember(this)
      }
    } else if (hasTeam) {
      this.team = this.joinTeamImmediate(data.team)
    }

    let defaultTeam = data.defaultTeam && this.game.getEntity(data.defaultTeam.id)
    let hasDefaultTeam = defaultTeam && defaultTeam instanceof Team
    if (hasDefaultTeam) {
      this.defaultTeam = defaultTeam
    }

    if (!this.team) {
      if (this.defaultTeam) {
        this.team = this.defaultTeam
      } else {
        let teamOptions = { name: this.name }
        this.team = this.createJoinableTeam(teamOptions)
        this.defaultTeam = this.team
      }
    }

    if (data.roleType) {
      if (this.team.getRole(data.roleType)) {
        this.roleType = data.roleType
      } else {
        this.roleType = Team.GuestRoleType
      }
    } else if (!this.roleType) {
      this.roleType = Team.GuestRoleType
    }

    if (data.isTroubleshooter) {
      this.isTroubleshooter = true
      this.sector.addTroubleshooter(this)
    }

    if (data.equipments) {
      for (let index in data.equipments.storage) {
        let itemData = data.equipments.storage[index]
        let item = new Item(this, itemData.type, itemData)
        this.equipments.storeAt(itemData.index, item)
      }
    }

    if (data.inventory) {
      for (let index in data.inventory.storage) {
        let itemData = data.inventory.storage[index]
        let item = new Item(this, itemData.type, itemData)
        this.inventory.storeAt(itemData.index, item)
      }
    } else {
      if (this.game.isCreatedByPlayer(this)) {
        this.inventory.storeAt(1, new Item(this, "Bottle"))
      }
      this.inventory.storeAt(0, new Item(this, "SurvivalTool"))
    }

    if (data.containerId) {
      this.ship = this.game.getEntity(data.containerId)
      this.setRelativePosition(data.relativeX, data.relativeY)
    }

    if (data.effects) {
      for (let effectName in data.effects) {
        let level = data.effects[effectName]
        if (level) {
          this.setEffectLevel(effectName, level)
        }
      }
    }

    if (data.tutorialIndex) {
      this.tutorialIndex = data.tutorialIndex
    }

    let isLoadedFromFile = data.aliveDurationInTicks
    if (isLoadedFromFile) {
      this.isFirstRoom = false
      this.isNewPlayer = false
    } else {
      this.isNewPlayer = true
    }

    if (this.health === 0) {
      if (this.game.isPvP()) {
        this.setRespawnTime()
      } else {
        this.respawn()
      }
    }
  }

  isImmuneTo(category) {
    if (this.isDestroyed() && category === 'miasma') return true

    return super.isImmuneTo(category)
  }

  getImmunity() {
    if (this.getArmorEquip()) {
      return this.getArmorEquip().getImmunity()
    } else {
      return []
    }
  }

  async updateCurrentUser() {
    if (this.isAnonymous()) return
    let user = await User.findOne({ where: { uid: this.uid } })
    if (!user) return

    let data = { ip: this.getRemoteAddress() }

    if (!this.game.isMiniGame()) {
      let sectorModel = await SectorModel.findOne({ where: { uid: this.sector.getUid() }})
      if (sectorModel) {
        data["currentSectorUid"] = sectorModel.uid
      }
    }

    await user.update(data)
  }

  isMod() {
    return this.uid === 'nPu0Js7belaeI6UdSz6AkPBdUkw2' // tobor1
  }

  isGameDev() {
    return this.uid === 'jEleFj7LAVhfv8FwLEKejEj6ESx2' ||
           this.uid === '8LuO6XRih2dRNfvtjaS2TwnLWzm1'
  }

  createSurvivalTool() {
    this.inventory.store(new Item(this, "SurvivalTool"))
  }

  createCore() {
    this.inventory.store(new Item(this, "Core"))
  }

  setRoleType(roleType) {
    if (this.game.isPvP() && roleType === Team.GuestRoleType) {
      return
    }

    if (this.roleType !== roleType) {
      let prevRoleType = this.roleType
      this.roleType = roleType
      this.onRoleTypeChanged(prevRoleType, roleType)
      this.onRoleAssigned()
      this.onStateChanged("roleType")
      if (this.team) {
        this.team.onMemberChanged()
      }
    }
  }

  onRoleTypeChanged(prevRoleType, currRoleType) {
    if (this.game.isTutorial) return
    if (this.game.isMiniGame()) return

    let roleName = this.getRole().name
    let message = i18n.t(this.locale, 'AssignedRole', { roleName: roleName })
    this.showError(message, { isSuccess: true, fontSize: 36 })

    let prevRole = this.getRoleForType(prevRoleType)
    let currRole = this.getRoleForType(currRoleType)
    this.game.triggerEvent("RoleChanged", {
      playerId: this.id,
      player: this.getName(),
      previous: prevRole ? prevRole.name : "",
      current: currRole ? currRole.name : ""
    })
  }

  toggleFly() {
    this.isFlying = !this.isFlying
    let message = this.isFlying ? "Flying mode enabled" : "Flying mode disabled"

    this.showError(message, { isSuccess: true, fontSize: 36 })
  }

  onRoleAssigned() {
    let role = this.getRole()
    if (role && role.hasKit()) {
      this.game.giveKit(role.kitName, this)
    }
  }

  isAdmin() {
    return this.roleType === Team.AdminRoleType
  }

  isMember() {
    return this.roleType === Team.MemberRoleType
  }

  isGuest() {
    return this.roleType === Team.GuestRoleType
  }

  register() {
    this.sector.addPlayer(this)
    this.game.addPlayer(this)

    this.repositionOnPlayerTree()

    this.updateCurrentUser()

    if (this.sector.getUid().match("PnGkJd5xZsb0v")) {
      this.tutorialIndex["main"] = 1
    }

    this.game.sendToMatchmaker({ event: "PlayerJoin",
      data: {
        playerRemoteAddress: this.getRemoteAddress(),
        fingerprint: this.fingerprint,
        host: this.game.server.getHost(),
        region: this.game.getRegion(),
        sectorUid: this.game.sectorUid
      }
    })
  }

  setLocale(locale) {
    this.locale = locale
  }

  getTeam() {
    return this.team
  }

  hasMemberPrivilege() {
    if (this.isAdmin()) return true

    return this.isMember()
  }

  async withdrawAccount(gold) {
    if (this.game.isMiniGame()) return

    let user = await User.findOne({ where: { uid: this.uid } })
    if (!user) return

    let currentBalance = user.gold || 0
    if (gold > currentBalance) {
      this.showError("Not enough Gold", { isWarning: true })
      return
    }

    if (this.lockGold) return

    this.lockGold = true

    let newBalance = user.gold - gold
    await user.update({ gold: newBalance })
    this.increaseGold(gold)

    this.lockGold = false

    this.onAccountBalanceChanged(newBalance)
  }

  onAccountBalanceChanged(balance) {
    this.getSocketUtil().emit(this.socket, "AccountBalance", { balance: balance })
  }

  async depositAccount(gold) {
    if (this.game.isMiniGame()) return

    let user = await User.findOne({ where: { uid: this.uid } })
    if (!user) return

    let currentBalance = user.gold || 0
    if (gold > this.gold) {
      this.showError("Not enough Gold", { isWarning: true })
      return
    }

    if (this.lockGold) return

    this.lockGold = true

    let newBalance = user.gold + gold
    await user.update({ gold: newBalance })
    this.reduceGold(gold)

    this.lockGold = false

    this.onAccountBalanceChanged(newBalance)
  }

  initCommands() {
    this.commands = {}
    this.commands["spawnpet"] = this.spawnPet.bind(this)
    this.commands["flow"] = this.flow.bind(this)
    this.commands["spawnmob"] = this.spawnMob.bind(this)

    this.commands["time"] = this.time.bind(this)
    this.commands["spawnbot"] = this.spawnBot.bind(this)
    this.commands["spawnship"] = this.spawnShip.bind(this)
    this.commands["debug"] = this.debugCommand.bind(this)
    this.commands["chunkflow"] = this.chunkFlow.bind(this)
    this.commands["chunkPath"] = this.chunkPath.bind(this)
    this.commands["gold"] = this.setGoldAmount.bind(this)
    this.commands["die"] = this.performSuicide.bind(this)
    this.commands["disc"] = this.performMatchmakerDisconnect.bind(this)
    this.commands["speed"] = this.speedCommand.bind(this)
    this.commands["admin"] = this.setAdmin.bind(this)
    this.commands["slave"] = this.workSlave.bind(this)
  }

  /*
    debug room 344
    debug chunk_region_flow [source] [destination]
    [command] [type] [id]
  */
  debugCommand(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.showChatError("/debug [type] [id]")
      return
    }

    const type = args[0]
    const id = args[1]

    if (type === "room") {
      let room = this.sector.roomManager.rooms[id]
      this.renderRoomPressureNetwork(room)
    }
  }

  hasOwnership(entity) {
    if (!entity.owner) return false
    if (entity.owner === this) return true
    if (this.getTeam() && this.getTeam().hasOwnership(entity)) return true

    return false
  }

  chunkFlow(args) {
    if (!this.isAdminMode) return

    if (!args[0] || !args[1]) {
      this.showChatError("/chunkflow [source_chunk_region_id] [destination_chunk_region_id]")
      return
    }

    const sourceChunkRegionId = args[0]
    const destinationChunkRegionId = args[1]

    let flowFields = this.sector.pathFinder.getFlowFieldsByChunkRegionId(sourceChunkRegionId)
    let flowField = flowFields[destinationChunkRegionId]

    if (!flowField) {
      let sourceChunkRow = sourceChunkRegionId.split("-")[0]
      let sourceChunkCol = sourceChunkRegionId.split("-")[1]

      let sourceChunkRegion = this.sector.getChunk(sourceChunkRow, sourceChunkCol).getChunkRegions()[sourceChunkRegionId]

      let destinationChunkRow = destinationChunkRegionId.split("-")[0]
      let destinationChunkCol = destinationChunkRegionId.split("-")[1]

      let destinationChunkRegion = this.sector.getChunk(destinationChunkRow, destinationChunkCol).getChunkRegions()[destinationChunkRegionId]

      flowField = this.sector.pathFinder.getFlowFieldToReachChunkRegion(this, sourceChunkRegion, destinationChunkRegion)
    }

    if (flowField) {
      this.getSocketUtil().emit(this.socket, "FlowField", flowField.toJson())
    }
  }

  canTravelInSpace() {
    return true
  }

  chunkPath(args) {
    if (!this.isAdminMode) return

    if (!args[0] ) {
      this.showChatError("/chunkpath [entity_id]")
      return
    }

    const entityId = args[0]
    let entity = this.game.getEntity(entityId)
    let chunkRegionPath = entity.requestChunkRegionPath()
  }

  flow(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.showChatError("/flow [entity_id]")
      return
    }

    const entityId = args[0]
    let entity = this.game.getEntity(entityId)
    if (!entity) return

    let flowField = this.sector.pathFinder.flowFields[entityId]

    if (!flowField) {
      flowField = this.sector.pathFinder.getFlowFieldToReachSameChunkRegion(entity)
    }

    if (flowField) {
      this.sector.pathFinder.addFlowSubscription(flowField, this)
      this.getSocketUtil().emit(this.socket, "FlowField", flowField.toJson())
    }
  }

  toJson() {
    return {}
  }

  sendChunkRegions() {
    let chunks = this.getVisibleChunks()

    for (let chunkId in chunks) {
      chunks[chunkId].sendChunkRegions(this)
    }
  }

  kick() {
    this.isKicked = true

    this.remove()
  }

  sendChunkRegionPaths() {
    if (Object.keys(this.clientState["chunkRegionPaths"]).length === 0) {
      let json = []
      for (let key in this.sector.pathFinder.chunkRegionPaths) {
        let chunkRegionPath = this.sector.pathFinder.chunkRegionPaths[key]
        let chunkRegionPathJson = chunkRegionPath.toJson()
        json.push(chunkRegionPathJson)
        this.clientState["chunkRegionPaths"][key] = chunkRegionPathJson
      }


      this.getSocketUtil().emit(this.socket, "UpdateChunkRegionPath", { chunkRegionPaths: json })
    }
  }

  renderRoomPressureNetwork(room) {
    if (room.pressureNetwork) {
      let data = {
        type: "room",
        data: JSON.stringify(room.pressureNetwork.toDebugJson()),
      }
      this.getSocketUtil().emit(this.socket, "RenderDebug", data)
    }
  }

  setGoldAmount(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.getSocketUtil().emit(this.socket, "ServerChat", { message: "%error%/gold [amount]" })
      return
    }

    let gold = parseInt(args[0])
    if (!isNaN(gold)) {
      this.setGold(gold)
    }
  }

  performSuicide() {
    if (!this.isAdminMode) return

    this.setHealth(0)
  }

  performMatchmakerDisconnect() {
    if (!this.isAdminMode) return

    this.game.server.matchmakerClient.close()
  }

  workSlave(args) {
    if (!debugMode) return

    const entityId = args[0]
    let slave = this.game.getEntity(entityId)
    if (!slave) return
    slave.planner.execute()
  }

  async acceptRules() {
    let user = await User.findOne({ where: { uid: this.uid } })
    if (user) {
      await user.update({ isRulesRead: true })
    }
  }

  setAdmin() {
    if (!debugMode) return

    this.isAdminMode = !this.isAdminMode
    this.showChatSuccess("admin mode: " + (this.isAdminMode ? "ON" : "OFF" ))

    this.getSocketUtil().emit(this.socket, "SetAdmin", { isAdminMode: this.isAdminMode })
  }

  enableAdmin() {
    this.isAdminMode = !this.isAdminMode
    this.showChatSuccess("admin mode: " + (this.isAdminMode ? "ON" : "OFF" ))

    this.getSocketUtil().emit(this.socket, "SetAdmin", { isAdminMode: this.isAdminMode })
  }

  isConnected() {
    return !this.getSocket().isClosed
  }

  transformIntoGhost() {
    if (this.possessId) {
      // unpossess
      let entity = this.game.getEntity(this.possessId)
      if (entity) {
        entity.setDormant(false)
      }
      this.possessId = null
    }

    if (!this.ghost) {
      this.ghost = new Mobs.Ghost(this.sector, { x: this.getCameraFocusTarget().getX(), y: this.getCameraFocusTarget().getY() })
      this.ghost.master = this
      this.ghost.setAngle(90)
    }

    this.setCameraFocusTarget(this.ghost)
  }

  resetCameraFocusTarget() {
    if (this.ghost) {
      this.setCameraFocusTarget(this.ghost)
    } else {
      this.setCameraFocusTarget(this)
    }
  }

  followGhost() {
    this.shouldFollowGhost = true
  }

  isGod() {
    return this.godMode
  }

  /*
    time 17
    [command] [time in hours]
  */
  time(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.showChatError("/time [hour]")
      return
    }

    const hour = parseInt(args[0])
    if (isNaN(hour) || hour < 0 || hour > 23 ) {
      this.getSocketUtil().emit(this.socket, "ServerChat", { message: "%error%hour must be a number from 0-23" })
    }

    this.sector.setTime({ player: this, hour: hour })
  }

  /*
    spawnpet  spider 5 300 200
    [command] [type] [count] [x] [y]
  */
  spawnPet(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.getSocketUtil().emit(this.socket, "ServerChat", { message: "%error%/spawnpet [type] [count] [x] [y]" })
      return
    }

    const type = args[0]
    const count = args[1] ? parseInt(args[1]) : null
    const x = args[2]
    const y = args[3]
    const goal = args[4] || this

    return this.sector.spawnPet({ player: this, type: type, count: count, goal: goal, x: x, y: y })
  }


  spawnBot(args) {
    let mobs = this.spawnMob(args)
    mobs.forEach((mob) => {
      mob.setOwner(this)
      mob.setMaster(this)
    })
  }

  /*
    spawnmob  spider 5 100 64
    [command] [type] [count] [row] [col]
  */
  spawnMob(args) {
    if (!this.isAdminMode) return

  }

  /*
    spawnship warhammer 300 200
    [command] [type] [x] [y]
  */
  spawnShip(args) {
    if (!this.isAdminMode) return

    if (!args[0]) {
      this.showChatError("/spawnship [type] [x] [y]")
      return
    }

    const type = args[0]
    const x = args[1]
    const y = args[2]

    this.sector.spawnShip({ player: this, type: type, x: x, y: y })
  }

  initInventory() {
    this.inventory = new Inventory(this, Constants.Player.inventoryCount)
    this.setEquipIndex(0)
  }

  isDoingTutorial() {
    return true
  }

  getRespawnPosition() {
    return this.spawnPosition
  }

  onRoomBuilt() {
    if (this.isFirstRoom) {
      this.isFirstRoom = false
      //this.progressTutorial(9)
    }
  }

  getNumDaysAlive() {
    return this.sector.getDays(this.aliveDurationInTicks)
  }

  getDisplayName() {
    if (this.team && this.team.isJoinable()) {
      return "[" + this.team.getName() + "] " + this.name
    } else {
      return this.name
    }
  }

  onHourChanged() {
    let prevDaysAlive = this.daysAlive
    this.daysAlive = this.getNumDaysAlive()

    if (this.daysAlive !== prevDaysAlive) {
      this.onDaysAliveChanged()
    }
  }

  onDaysAliveChanged() {
    if (this.team) {
      this.team.onMemberChanged()
    }
  }

  async addScreenshot(data) {
    if (!this.isLoggedIn()) return
    if (!this.isSectorOwner()) return

    let screenshotCount = Object.keys(this.sector.screenshots).length
    if (screenshotCount >= Constants.maxColonyScreenshots) {
      this.showError("Maximum of " + Constants.maxColonyScreenshots + " screenshots", { isWarning: true })
      return
    }

    if (this.screenshotTaken > 5) {
      let screenshotThreshold = debugMode ? 10000 : 30000
      if (Date.now() - this.lastScreenshotTaken < screenshotThreshold) {
        this.showError("You've taken too many screenshots. Do it again later")
        return
      } else {
        this.screenshotTaken = 0
      }

    }

    for (let id in this.sector.screenshots) {
      this.getTeam().forEachMember((player) => {
        this.getSocketUtil().emit(player.getSocket(), "ScreenshotUpdated", { id: id, clientMustDelete: true })
      })
    }

    let screenshotId = await this.sector.replaceScreenshot(data, this)
    if (screenshotId) {
      this.getTeam().forEachMember((player) => {
        this.getSocketUtil().emit(player.getSocket(), "ScreenshotUpdated", { id: screenshotId, position: data.position })
      })

      this.lastScreenshotTaken = Date.now()
      this.screenshotTaken += 1
    } else {
      this.showError("Failed to take Screenshot")
    }
  }

  async removeScreenshot(data) {
    if (!this.isLoggedIn()) return
    if (!this.isSectorOwner()) return

    await this.sector.removeScreenshot(data.id, this)
    this.getTeam().forEachMember((player) => {
      this.getSocketUtil().emit(player.getSocket(), "ScreenshotUpdated", { id: data.id, clientMustDelete: true })
    })
  }

  getS3() {
    return this.game.getS3()
  }

  getNumHoursAlive() {
    let numTicksAlive = this.sector.game.timestamp - this.joinTimestamp
    return this.sector.getHours(numTicksAlive)
  }

  getDayCount() {
    let dayJoined = this.sector.getDays(this.joinTimestamp)
    let dayNow    = this.sector.getDays(this.sector.game.timestamp)

    return dayNow - dayJoined + 1
  }

  getAliveDurationInTicks() {
    return this.game.timestamp - this.joinTimestamp
  }

  createJoinableTeam(data) {
    let name = data.name

    if (!name) {
      this.showError("Name cant be blank")
      return
    }

    if (this.game.hasTeamWithName(name)) {
      name = "Team " + Math.random().toString(16).substring(13)
    }

    let team = this.getTeam()
    if (team && team.isJoinable()) {
      this.showError("Already part of a team")
      return
    }

    let teamName

    if (this.shouldUseSectorName()) {
      teamName = this.game.sectorName
    } else {
      teamName = name
    }

    team = new Team(this.sector, { name: teamName, joinable: true, leader: this, isPrivate: data.isPrivate })
    team.setCreator(this)
    team.addMember(this)

    return team
  }

  createSelfTeam() {
    let isPrivate = this.game.isPvP() ? false : true
    let team = new Team(this.sector, { name: this.name, joinable: true, leader: this, isPrivate: isPrivate })
    team.setCreator(this)
    team.addMember(this)
    this.setRoleType(Team.AdminRoleType)
    this.team = team
    this.defaultTeam = team
  }

  shouldUseSectorName() {
    if (this.game.isPvP()) return false

    return this.game.isCustomNameProvided
  }

  getJoinableTeam() {
    if (!this.team) return null
    return this.team.isJoinable() && this.team
  }

  joinTeam(data) {
    if (!this.sector.settings.showTeamJoin) return

    let team = this.game.teams[data.id]
    if (team && team.isJoinable()) {
      let approvers = team.getInviteApprovers()
      if (approvers.length > 0) {
        this.teamRequests[team.id] = true
        approvers.forEach((approver) => {
          this.getSocketUtil().emit(approver.getSocket(), "TeamRequest", { playerId: this.getId(), playerName: this.getName() })
        })
      }
    }
  }

  joinTeamImmediate(team) {
    if (!team.isJoinable()) {
      this.showError("Team cant be joined")
      return
    }

    team.addMember(this)
    return team
  }

  setLeaveTimestamp() {
    this.leaveTimestamp = this.game.timestamp
  }

  hasRecentlyLeftTeam() {
    if (!this.leaveTimestamp) return false

    let duration = this.game.timestamp - this.leaveTimestamp
    return duration < (Constants.physicsTimeStep * 60 * 3)
  }

  leaveTeam() {
    if (!this.getTeam()) return

    this.setLeaveTimestamp()

    let team = this.getTeam()
    // LOG.info(`${this.name} leave team. about to leave member of ${team.name} - online: ${team.getMemberCount()} offline: ${team.getOfflineMemberCount()}`)
    this.getTeam().removeMember(this)
  }

  isTeamLeader() {
    return this.team.getLeader() === this
  }

  isAlreadyPartOfJoinableTeam() {
    return this.team && this.team.isJoinable()
  }

  hasPhysics() {
    return true
  }

  setHangar(data) {
    let hangarController = this.game.getEntity(data.id)
    if (!hangarController) return

    let region = this.sector.regions[hangarController.getRegionId()]
    if (!region) {
      region = hangarController.initRegion(data.x, data.y, data.w, data.h)
      region.setData(data)
    } else {
      region.setData(data)
      hangarController.setRegion(region)
    }
  }

  getActiveItem() {
    return this.inventory.get(this.equipIndex)
  }

  getInventoryItemCount(typeName) {
     let klass = Item.getKlassByName(this.sector.klassifySnakeCase(typeName))
     if (!klass) return 0
     return this.inventory.getItemCount(klass.prototype.getType())
  }


  initEquipment() {
    this.equipments = new EquipmentInventory(this, 4)
  }

  initStartingEquipment() {
    if (!this.getArmorEquipment()) {
      const equipmentItem = new Item(this, Protocol.definition().BuildingType.SpaceSuit)
      this.equipments.storeAt(Protocol.definition().EquipmentRole.Armor, equipmentItem)
    }

    if (this.isAdmin()) {
      if (!this.game.isPvP()) {
        this.inventory.store(new Item(this, "Core"))
      }
      this.setGold(150)
    }
  }

  getStorage(storageId) {
    if (storageId === Constants.inventoryStorageId) {
      return this.inventory
    } else if (storageId === Constants.equipmentStorageId) {
      return this.equipments
    } else if (storageId === Constants.worldStorageId) {
      return this.sector
    } else {
      return this.game.getEntity(storageId)
    }
  }

  getNonInventoryStorage(storage, otherStorage) {
    let result  = null

    if (!storage.isInventory()) {
      result = storage
    } else if (!otherStorage.isInventory()) {
      result = otherStorage
    }

    return result
  }

  getCircle() {
    // collision circle. make radius large than actual tile-collision one
    // makes it easier for enemy to hit me.
    return { x: this.getX(), y: this.getY() , radius: Constants.tileSize }
  }


  getOccupiedRoom() {
    let platform = this.getStandingPlatform()
    if (!platform) return null

    return platform.getRoom()
  }

  getRoom() {
    let platform = this.getStandingPlatform()
    if (!platform) return null

    return platform.getRoom()
  }

  editShip(data) {
    const ship = this.game.getEntity(data.id)
    ship.setPosition(ship.hangar.getX(), ship.hangar.getY())
    ship.setAngle(0)
  }

  performItemStore(sourceStorage, destinationStorage, sourceIndex) {
    if (destinationStorage.isSector()) {
      let sourceItem      = sourceStorage.retrieve(sourceIndex)
      if (sourceItem) {
        this.throwInventory(sourceItem)
      }
    } else {
      // validate

      let sourceItem = sourceStorage.get(sourceIndex)
      if (!sourceItem) return

      if (!destinationStorage.canStore(null, sourceItem)) {
        this.showError("Invalid Item")
        return
      }

      if (destinationStorage.isFull(sourceItem.type)) {
        this.showError("Inventory Full")
        return
      }

      // retrieve
      let stackableIndex = destinationStorage.getStackableSpaceIndex(sourceItem.type, 0)
      if (stackableIndex >= 0) {
        let destinationItem = destinationStorage.get(stackableIndex)
        // increment/decrement stack
        let maxStackableIncrement = destinationItem.getMaxStack() - destinationItem.count
        let sourceReductionAmount = sourceItem.count > maxStackableIncrement ? maxStackableIncrement : sourceItem.count
        sourceItem.setCount(sourceItem.count - sourceReductionAmount)
        destinationItem.setCount(destinationItem.count + sourceReductionAmount)

        this.triggerStorageStackEvents(sourceStorage, destinationStorage, sourceItem, sourceReductionAmount)

      } else {
        sourceItem = sourceStorage.retrieve(sourceIndex)

        //store
        if (sourceItem) {
          this.triggerStorageStoreEvents(sourceStorage, destinationStorage, sourceItem)
          destinationStorage.store(sourceItem)
        }
      }
    }
  }

  triggerStorageGet(sourceStorage, sourceItem, sourceReductionAmount) {
    this.game.triggerEvent("StorageGet", {
      playerId: this.getId(),
      player: this.getName(),
      storageId: sourceStorage.getId(),
      storageType: sourceStorage.getTypeName(),
      itemType: sourceItem.getTypeName(),
      count: sourceReductionAmount
    })
  }

  triggerStorageStackEvents(sourceStorage, destinationStorage, sourceItem, sourceReductionAmount) {
    if (sourceStorage === destinationStorage) return
    if (sourceStorage && sourceStorage.isInventory() && destinationStorage.isInventory()) return

    if (destinationStorage.isInventory()) {
      this.game.triggerEvent("StorageGet", {
        playerId: this.getId(),
        player: this.getName(),
        storageId: sourceStorage.getId(),
        storageType: sourceStorage.getTypeName(),
        itemType: sourceItem.getTypeName(),
        count: sourceReductionAmount
      })
    } else if (destinationStorage.isBuildingStorage()) {
      this.game.triggerEvent("StoragePut", {
        playerId: this.getId(),
        player: this.getName(),
        storageId: destinationStorage.getId(),
        storageType: destinationStorage.getTypeName(),
        itemType: sourceItem.getTypeName(),
        count: sourceReductionAmount
      })
    }

    if (sourceStorage) {
      this.game.triggerEvent("StoreItem", {
        actorId: this.getId(),
        sourceStorageId: sourceStorage.getId(),
        sourceStorageType: sourceStorage.getType(),
        destinationStorageId: destinationStorage.getId(),
        destinationStorageType: destinationStorage.getType(),
        itemType: sourceItem.type,
        itemCount: sourceReductionAmount
      })
    }
  }


  triggerStorageStoreEvents(sourceStorage, destinationStorage, sourceItem) {
    if (sourceStorage === destinationStorage) return
    if (sourceStorage && sourceStorage.isInventory() && destinationStorage.isInventory()) return

    if (destinationStorage.isInventory()) {
      this.game.triggerEvent("StorageGet", {
        playerId: this.getId(),
        player: this.getName(),
        storageId: sourceStorage.getId(),
        storageType: sourceStorage.getTypeName(),
        itemType: sourceItem.getTypeName(),
        count: sourceItem.count
      })
    } else if (destinationStorage.isBuildingStorage()) {
      this.game.triggerEvent("StoragePut", {
        playerId: this.getId(),
        player: this.getName(),
        storageId: destinationStorage.getId(),
        storageType: destinationStorage.getTypeName(),
        itemType: sourceItem.getTypeName(),
        count: sourceItem.count
      })
    }

    if (sourceStorage) {
      this.game.triggerEvent("StoreItem", {
        actorId: this.getId(),
        sourceStorageId: sourceStorage.getId(),
        sourceStorageType: sourceStorage.getType(),
        destinationStorageId: destinationStorage.getId(),
        destinationStorageType: destinationStorage.getType(),
        itemType: sourceItem.type,
        itemCount: sourceItem.count
      })
    }
  }

  performItemThrow(sourceStorage, sourceIndex) {
    if (sourceStorage.isEquipmentStorage() &&
        sourceIndex === Protocol.definition().EquipmentRole.Armor &&
        !this.sector.shouldAllowSuitChanged()) {
      return
    }

    if (this.game.isMiniGame()) {
      if (this.game.sector.miniGame.name === 'find_the_imposter') {
        return
      }
    }

    let sourceItem      = sourceStorage.retrieve(sourceIndex)
    if (sourceItem) {
      this.throwInventory(sourceItem)
    }
  }

  hasCommandsPermission() {
    if (this.isSectorOwner()) return true
    if (!this.getRole()) return false

    return this.getRole().isAllowedTo("UseCommands")
  }

  throwInventory(item) {
    if (this.game.isMiniGame()) {
      if (this.game.sector.miniGame.name === 'find_the_imposter') {
        return
      }
    }

    super.throwInventory(item)

    this.game.triggerEvent("ItemDropped", {
      playerId: this.getId(),
      player: this.getName(),
      itemType: item.getTypeName(),
      count: item.getCount()
    })
  }

  performItemSwap(sourceStorage, destinationStorage, sourceIndex, destinationIndex) {
    // swap operation
    let sourceItem      = sourceStorage.get(sourceIndex)
    if (!destinationStorage.storage) return // destination no storage

    let destinationItem = destinationStorage.get(destinationIndex)

    let disallowSuitChange = (this.game.isMiniGame() && this.game.sector.miniGame.name === 'find_the_imposter') ||
                             !this.sector.shouldAllowSuitChanged()
    if (disallowSuitChange) {
      if (sourceStorage.isEquipmentStorage() || destinationStorage.isEquipmentStorage()) {
        return
      }
    }

    let isSwappingByItself = sourceStorage === destinationStorage && sourceIndex === destinationIndex
    if (isSwappingByItself) return

    let isSourceDestinationStorable = destinationStorage.canStore(destinationIndex, sourceItem) &&
                         sourceStorage.canStore(sourceIndex, destinationItem)
    if (!isSourceDestinationStorable) return

    // if same type, stack them
    if (sourceItem && destinationItem &&
        sourceItem.type === destinationItem.type &&
        !destinationItem.isFullyStacked() &&
        destinationItem.isStackableType()) {
      let maxStackableIncrement = destinationItem.getMaxStack() - destinationItem.count
      let sourceReductionAmount = sourceItem.count > maxStackableIncrement ? maxStackableIncrement : sourceItem.count
      sourceItem.setCount(sourceItem.count - sourceReductionAmount)
      destinationItem.setCount(destinationItem.count + sourceReductionAmount)

      this.triggerStorageStackEvents(sourceStorage, destinationStorage, sourceItem, sourceReductionAmount)
    } else {
      // perform swap
      // retrieve from source/destination
      destinationItem = destinationStorage.retrieve(destinationIndex)
      sourceItem      = sourceStorage.retrieve(sourceIndex)

      // store
      if (destinationItem) {
        // need to swap source/destination for event tracking
        this.triggerStorageStoreEvents(destinationStorage, sourceStorage, destinationItem)
        sourceStorage.storeAt(sourceIndex, destinationItem)
      }

      if (sourceItem) {
        this.triggerStorageStoreEvents(sourceStorage, destinationStorage, sourceItem)

        destinationStorage.storeAt(destinationIndex, sourceItem)
      }
    }
  }

  manageStack(data) {
    const storage = this.getStorage(data.storageId)
    const storageIndex = data.index

    if (!storage) return
    if (storage.isEquipmentStorage() && !this.sector.shouldAllowSuitChanged()) return

    if (data.mode === Protocol.definition().StackOperationType.Split) {
      if (storage.isSector()) {
        this.throwStack()
      } else {
        this.splitStack(storage, storageIndex)
      }
    } else {
      let count = data.hasOwnProperty("count") ? data.count : 1
      this.mergeStack(storage, storageIndex, data.count)
    }
  }

  throwStack() {
    if (!this.holdItem) return

    this.throwInventory(this.holdItem)
    this.holdItem = null

    let json = { index: Constants.holdItemIndex, clientMustDelete: true }
    this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: json })
  }

  hasInfiniteAmmo() {
    return this.sector.hasInfiniteAmmo()
  }

  splitStack(storage, storageIndex) {
    if (this.holdItem) return

    let item = storage.get(storageIndex)
    if (!item) return

    if (item.hasInstance()) {
      storage.removeItem(item)
      this.holdItem = item
      this.holdItem.index = Constants.holdItemIndex

      if (storage.isBuildingStorage()) {
        this.triggerStorageGet(storage, item, item.count)
      }
    } else {
      let splitCount = Math.ceil(item.getCount() / 2)
      let amountReduced = item.reduceCount(splitCount)

      this.holdItem = new Item(this, item.type, { count: amountReduced })
      this.holdItem.index = Constants.holdItemIndex

      if (storage.isBuildingStorage()) {
        this.triggerStorageGet(storage, item, amountReduced)
      }
    }

    this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: this.holdItem })

    if (storage.isBuildingStorage()) {
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: storage.id, inventory: storage })
    }
  }

  createItem(type, options = {}) {
    return new Item(this, type, options)
  }

  isMergedAllowed(item, storage, storageIndex) {
    let isEmptySlot = !item

    if (isEmptySlot) {
      return storage.canStore(storageIndex, this.holdItem)
    } else {
      let isSameItemType = item && item.type === this.holdItem.type
      return isSameItemType && item.isStackableType() && !item.isFullyStacked()
    }
  }

  mergeStack(storage, storageIndex, count = 1) {
    if (!this.holdItem) return

    let item = storage.get(storageIndex)

    if (!this.isMergedAllowed(item, storage, storageIndex)) return

    if (this.holdItem.hasInstance()) {
      storage.removeAt(this.holdItem.storageIndex)
      storage.storeAt(storageIndex, this.holdItem)
      this.holdItem = null

      let json = { index: Constants.holdItemIndex, clientMustDelete: true }
      this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: json })
    } else {
      let reducableCount
      if (item && (item.count + this.holdItem.count > 99)) {
        // overflow
        reducableCount = 99 - item.count
        if (reducableCount < 0) {
          reducableCount = 0
        }
      } else {
        reducableCount = count
      }

      let amountReduced = this.holdItem.reduceCount(reducableCount)
      if (amountReduced <= 0) return

      if (item) {
        item.increaseCount(amountReduced)

        if (item.storage.isBuildingStorage()) {
          this.triggerStorageStackEvents(null, storage, item, amountReduced)
        }
      } else {
        let item = new Item(this, this.holdItem.type, { count: amountReduced })
        storage.storeAt(storageIndex, item)

        if (storage.isBuildingStorage()) {
          this.triggerStorageStoreEvents(null, storage, item)
        }
      }

      if (this.holdItem.getCount() === 0) {
        this.holdItem = null
        let json = { index: Constants.holdItemIndex, clientMustDelete: true }
        this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: json })
      }
    }

    if (storage.isBuildingStorage()) {
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: storage.id, inventory: storage })
    }

  }

  swapInventory(data) {
    const sourceStorage      = this.getStorage(data.sourceStorageId)
    const destinationStorage = this.getStorage(data.destinationStorageId)
    const sourceIndex        = data.sourceIndex
    const destinationIndex   = data.destinationIndex

    const isInvalidOperation = !sourceStorage || !destinationStorage || sourceIndex < 0 || destinationIndex < 0 ||
                              sourceIndex >= sourceStorage.getStorageLength() ||
                              destinationIndex >= destinationStorage.getStorageLength() ||
                              !destinationStorage.canStoreAt(destinationIndex)
    if (isInvalidOperation) return

    const nonInventoryStorage = this.getNonInventoryStorage(sourceStorage, destinationStorage)

    const isThrowOperation = destinationStorage.isSector()
    const isStoreOperation = !data.hasOwnProperty("destinationIndex")

    if (isThrowOperation) {
      this.performItemThrow(sourceStorage, sourceIndex)
    } else if (isStoreOperation) {
      this.performItemStore(sourceStorage, destinationStorage, sourceIndex)
    } else {
      this.performItemSwap(sourceStorage, destinationStorage, sourceIndex, destinationIndex)
    }

    // no longer have anything equipment
    let activeItem = this.getActiveItem()
    if (!activeItem) {
      this.removeHandEquipment()
    }

    if (nonInventoryStorage) {
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: nonInventoryStorage.id, inventory: nonInventoryStorage })
    }
  }

  canAccessStorage(storage) {
    if (storage.hasCustomPermissions()) {
      return storage.isAllowedToView(this)
    } else if (storage.hasCategory("ammo_turret")) {
      if (!this.getRole().isAllowedTo("AccessStorage")) {
        return false
      }
    }

    return true
  }

  getRole() {
    if (!this.getTeam()) return null
    return this.getTeam().getRole(this.roleType)
  }

  getRoleForType(roleType) {
    if (!this.getTeam()) return null
    return this.getTeam().getRole(roleType)
  }

  viewStorage(data) {
    // TODO: validate that its within view of user
    const storage = this.game.getEntity(data.id)
    if (storage) {
      if (!storage.isReachableFromRoom(this.getOccupiedRoom())) {
        this.showError("Unreachable")
        return
      }

      if (storage.hasOwner() && !this.hasOwnership(storage)) {
        this.showError("That doesnt belong to you")
        return
      }

      if (!storage.hasCategory("vending_machine")) {
        if (storage.owner &&
            storage.owner.isTeam() &&
            !this.canAccessStorage(storage)) {
          this.showError("Permission Denied")
          return
        }
      }

      storage.addViewSubscriber(this)
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: storage.id, inventory: storage })
    }
  }

  isSectorOwner() {
    return this.sector.game.getCreatorUid() === this.getUid()
  }

  closeStorage(data) {
    const storage = this.game.getEntity(data.id)
    if (storage) {
      if (typeof storage.removeViewSubscriber !== 'function') {
        this.game.captureException(new Error("[" + storage.constructor.name + "] entity.removeViewSubscriber not function"))
      } else {
        storage.removeViewSubscriber(this)
      }

    }
  }

  craft(data) {
    const storage = this.getStorage(data.storageId)
    if (storage.hasCategory("power_consumer") && !storage.isPowered) return
    if (!storage.isCraftingStorage()) return
    if (storage.isFull(data.type)) {
      this.showError("Inventory Full")
      return
    }

    if (this.game.isMiniGame() && !data.sourceStorageId) {
      if (!this.game.sector.miniGame.canCraft()) {
        return
      }
    }

    if (!this.sector.settings.isCraftingEnabled) return

    let count = data.count ? data.count : 1

    if (!this.sector.canBeCrafted(data.type)) {
      return
    }

    const item = new Item(this, data.type, { count: count })
    let requirements = item.getRequirements()
    if (Object.keys(requirements).length === 0) {
      // item without requirements cant be crafted
      return
    }

    const isSuccess = storage.craft(item, this.inventory.storage)
    if (!isSuccess) return

    if (storage.isBuildingStorage()) {
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: storage.id, inventory: storage })
    } else {
      this.game.triggerEvent("ItemCrafted", { type: item.getTypeName(), player: this.getName() })
      this.getSocketUtil().emit(this.socket, "CraftSuccess", { name: item.getTypeName(), count: count })
    }
  }

  getType() {
    return Protocol.definition().MobType.Human
  }

  viewCraftingQueue(data) {
    // TODO: validate that its within view of user
    const storage = this.game.getEntity(data.id)
    if (storage) {
      this.getSocketUtil().emit(this.socket, "RenderStorage", { id: storage.id, inventory: storage })
    }
  }

  initClientState() {
    // remember what client has created, so we only send deltas instead of full object json
    this.clientState = {
      buildings: {},
      chunkRegionPaths: {}
    }
  }

  getSentHour() {
    return this.hour
  }

  setSentHour(hour) {
    this.hour = hour
  }

  limitVerticalMovement() {
    if (this.isFlying) return

    const isNotOnShip = !this.ship
    if (isNotOnShip) {
      this.limitVerticalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.groundMap], this.body, this.body.position)

    } else if (this.ship) {
      this.limitVerticalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.platformMap, this.sector.groundMap], this.body, this.body.position)

      this.limitVerticalMovementDynamic()
    }
  }

  limitHorizontalMovement() {
    if (this.isFlying) return

    const isNotOnShip = !this.ship
    if (isNotOnShip) {
      this.limitHorizontalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.groundMap], this.body, this.body.position)
    } else if (this.ship) {
      this.limitHorizontalVelocityAndPosition([this.sector.armorMap, this.sector.structureMap, this.sector.groundMap, this.sector.platformMap], this.body, this.body.position)

      this.limitHorizontalMovementDynamic()
    }
  }

  limitVerticalMovementDynamic() {
    const radius = this.getWidth()  // double radius to have more padding between obstacle (earlier detection)
    const colliderMargin = this.body.velocity[1] > 0 ? 10 : -10
    const circle = new SAT.Circle(new SAT.Vector(this.getX(),this.getY() + colliderMargin), radius)
    for (let shipId in this.sector.ships) {
      let ship = this.sector.ships[shipId]
      if (ship.polygon) {
        let response = new SAT.Response()
        let isColliding = SAT.testPolygonCircle(ship.polygon, circle, response)
        if (isColliding) {
          this.resetVerticalVelocity(this.body)
        }
      }

    }
  }

  limitHorizontalMovementDynamic() {
    const radius = this.getWidth()  // double radius to have more padding between obstacle (earlier detection)
    const colliderMargin = this.body.velocity[0] > 0 ? 10 : -10
    const circle = new SAT.Circle(new SAT.Vector(this.getX() + colliderMargin, this.getY()), radius)
    for (let shipId in this.sector.ships) {
      let ship = this.sector.ships[shipId]
      if (ship.polygon) {
        let response = new SAT.Response()
        let isColliding = SAT.testPolygonCircle(ship.polygon, circle, response)
        if (isColliding) {
          this.resetHorizontalVelocity(this.body)
        }
      }

    }
  }

  getName() {
    return this.name
  }

  getRange() {
    return this.getStats().range
  }

  teleport(sectorId) {
    const prevSector = this.sector
    const sector = this.game.sectors[sectorId]

    if (sector) {
      this.removeChunkSubscriptions()

      this.setSector(sector)
      this.onPositionChanged({ isGridPositionChanged: true })

      this.getSocketUtil().broadcast(prevSector.getSocketIds(), 'LeaveSector', { player: this }, { excludeSocketId: this.getSocket().id })
      this.getSocketUtil().broadcast(this.sector.getSocketIds(), 'EnterSector', { player: this }, { excludeSocketId: this.getSocket().id })
      this.getSocketUtil().emit(this.getSocket(),'Teleport', {
        playerId: this.id,
        inventory: this.inventory,
        sector: sector,
        players: sector.players,
        equipIndex: this.equipIndex
      })
    }
  }

  setSector(sector) {
    const prevSector = this.sector
    if (sector) {
      sector.addPlayer(this)
    }

    if (this.ship) {
      this.ship.setSector(sector)
    }

    if (prevSector !== sector) {
      this.onSectorChanged(prevSector, sector)
    }
  }

  onSectorChanged(prevSector, sector) {
    if (prevSector) {
      prevSector.removeEntityFromTreeByName(this, "players")

      if (this.isTroubleshooter) {
        prevSector.removeTroubleshooter(this)
      }

      prevSector.pathFinder.removeDebugSubscriber(this)
      prevSector.removePlayer(this)
    }

    // reset client state
    this.initClientState()
  }

  teleportToBase() {
    if (!this.ship) this.ship = this.homeShip

    this.teleport(this.homeSector.id)

    if (this.ship && this.ship.health === 0) {
      this.startRepair()
    }
  }

  setRespawnTime() {
    this.lastDestroyedTime = this.game.clock
    this.respawnTime = this.lastDestroyedTime + this.getRespawnCooldown()
  }

  getRespawnCooldown() {
    if (this.sector.eventHandler.restartCooldown) {
      return this.sector.eventHandler.restartCooldown
    }

    return Constants.restartCooldown
  }

  isPlayer() {
    return true
  }

  teleportToGalaxy() {
    this.teleport(this.game.galaxy.id)
  }

  initMothership() {
    this.blueprint = new Blueprint(this.getBlueprintData())
    this.ship = new Ship(this.sector, { x: this.getX(), y: this.getY() }, { blueprint: this.blueprint, pilot: this })

    this.homeShip = this.ship
  }

  getBlueprintData() {
    return { rowCount: this.getRowCount(), colCount: this.getColCount(), components: {} }

    // return require("./../../" + Constants.ShipDesignDirectory + "trek.json")
    // return require("./../../" + Constants.ShipDesignDirectory + "starter_bridge.json")
    // return require("./../../" + Constants.ShipDesignDirectory + "walkable_ship.json")

    return {
      rowCount: 50,
      colCount: 50,
      components: {
        platforms: this.getPlatformBlueprint(),
        armors: [],
        structures: this.getBuildingBlueprint(),
        units: this.getUnitBlueprint()
      }
    }
  }

  getPlayer() {
    return this
  }

  getPlatformBlueprint() {
    const defaultBuildingAngle = 0
    const middle = this.getTileCount()/2
    const adjustment = 0.5

    const positions = [
      [-0.5, -2.5], // top
      [ 0.5, -2.5],
      [-0.5, -1.5],
      [ 0.5, -1.5],
      [-2.5, -0.5], // sides
      [-2.5,  0.5],
      [-1.5, -0.5],
      [-1.5,  0.5],
      [ 1.5, -0.5],
      [ 1.5,  0.5],
      [ 2.5, -0.5],
      [ 2.5,  0.5],
      [-0.5,  1.5], // bottom
      [ 0.5,  1.5],
    ]

    return positions.map((pos) => {
      return { type: "Platform", x: 32 * (middle + pos[0]), y: 32 * (middle + pos[1]), angle: defaultBuildingAngle }
    })

  }


  getBuildingBlueprint() {
    const defaultBuildingAngle = -90
    const middle = this.getTileCount() / 2

    return [
      { type: "ShipCore", x: 32 * middle, y: 32 * middle, angle: defaultBuildingAngle },
      { type: "MineralMiner", x: 32 * middle, y: 32 * middle - 64, angle: defaultBuildingAngle },
      { type: "Bridge", x: 32 * middle, y: 32 * middle + 64, angle: defaultBuildingAngle },
    ]
  }

  getUnitBlueprint() {
    const defaultBuildingAngle = -90
    const middle = this.getTileCount() / 2
    const subMiddle = middle/2

    return []

    return [
      { type: "Fighter", x: 32 * subMiddle, y: 32 * 3, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * subMiddle, y: 32 * 5, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * subMiddle, y: 32 * 7, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * subMiddle, y: 32 * 9, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * (middle + subMiddle), y: 32 * 3, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * (middle + subMiddle), y: 32 * 5, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * (middle + subMiddle), y: 32 * 7, angle: defaultBuildingAngle },
      { type: "Fighter", x: 32 * (middle + subMiddle), y: 32 * 9, angle: defaultBuildingAngle },
    ]
  }

  warp(x, y) {
    if (this.lastWarpTimestamp === this.game.timestamp) {
      if (this.warpCountThisTick > 10) {
        return
      }
      this.warpCountThisTick++
    } else {
      this.warpCountThisTick = 1
    }

    if (this.currentVent) {
      this.currentVent.unhideFromVent(this)
    }

    let prevChunk = this.getChunk()
    this.setPosition(x, y)

    if (prevChunk) {
      prevChunk.addChangedPlayers(this)
    }

    this.lastWarpTimestamp = this.game.timestamp
  }

  setPositionFromVelocity() {
    if (this.ship) {
      super.setRelativePositionFromVelocity()
    } else {
      super.setPositionFromVelocity()
    }
  }

  canCreateDirt() {
    return this.getArmorEquipment()
  }

  registerToChunkRegion(chunkRegion) {
    if (this.chunkRegion !== chunkRegion) {
      if (this.chunkRegion) {
        this.chunkRegion.unregister("players", this)
      }

      this.chunkRegion = chunkRegion

      if (this.chunkRegion) {
        this.chunkRegion.register("players", this)
      }
    }
  }

  unregisterFromChunkRegion() {
    let chunkRegions = this.getChunkRegions()
    for (let id in chunkRegions) {
      let chunkRegion = chunkRegions[id]
      chunkRegion.unregister("players", this)
    }
  }

  updateMountPosition() {
    if (this.mounted && this.mounted.shouldUpdatePosition()) {
      this.mounted.setPosition(this.getX(), this.getY())
    }
  }

  setMounted(mounted) {
    this.mounted = mounted
  }

  onPositionChanged(options = {}) {
    this.repositionOnPlayerTree()

    if (this.getHandEquip()) {
      this.getHandEquip().onOwnerPositionChanged(this)
    }

    this.updateDragTargetPosition()
    this.updateMountPosition()
    this.consumeStamina("walk")
    this.retrievePickups()


    if (options.isGridPositionChanged) {
      if (this.getTeam() && !this.sector.isFovMode() && !this.isInvisible()) {
        this.getTeam().addChangedMapPosition(this)
      }

      this.registerToChunkRegion(this.getChunkRegion())

      this.setIsAngleLocked(false)
      this.removeRepairTarget()
      this.detectMiasma()
      this.spreadMiasma()
      this.consumeAndProduceDirt()
      this.triggerTraps()
      this.onGridPositionChanged()

      this.updateFlowFieldsForSelf()
      this.requestNewChunks()
    }

    this.checkInteractables()
    this.onStateChanged()
  }

  onGridPositionChanged() {
    if (this.sector.isFovMode()) {
      if (this.isControllingGhost()) return
      this.assignFov()
      if (this.dragTarget) {
        this.makeVisiblePlayersAwareOfCorpses()
      }
    }

    this.trackRegions()

    this.game.triggerEvent("PlayerMove", {
      player: this.getName(),
      row: this.getRow(),
      col: this.getCol()
    })
  }

  makeVisiblePlayersAwareOfCorpses() {
    for (let id in this.visiblePlayers) {
      let player = this.visiblePlayers[id]
      let prevCorpseVisible = player.visibleCorpses[this.dragTarget.getId()]
      let currCorpseVisible = player.calculateEntityVisible(this.dragTarget)
      if (prevCorpseVisible && !currCorpseVisible) {
        player.removeVisibleCorpse(this.dragTarget)
      } else if (!prevCorpseVisible && currCorpseVisible) {
        player.addVisibleCorpse(this.dragTarget)
      }
    }
  }

  assignFov() {
    this.fovTileHits = this.sector.fovManager.calculateFov(this)
    this.determineVisiblePlayers()
    this.determineVisibleCorpses()
  }

  hasSameViewDistance(player, otherPlayer) {
    return player.getMaxViewDistance() === otherPlayer.getMaxViewDistance()
  }

  determineVisiblePlayers() {
    let prevVisiblePlayers = this.visiblePlayers

    let visiblePlayers = this.getVisiblePlayers()

    // visible before. hidden now.
    for (let id in prevVisiblePlayers) {
      let player = prevVisiblePlayers[id]
      if (this.hasSameViewDistance(this, player)) {
        if (!visiblePlayers[id]) {
          this.removeVisiblePlayer(player)
          player.removeVisiblePlayer(this)
        }
      } else {
        if (!visiblePlayers[id]) {
          let player = prevVisiblePlayers[id]
          this.removeVisiblePlayer(player)
        }

        if (!player.calculateEntityVisible(this) && player.visiblePlayers[this.id]) {
          player.removeVisiblePlayer(this)
        }

      }
    }

    // hidden before. visible now.
    for (let id in visiblePlayers) {
      let player = visiblePlayers[id]
      if (this.hasSameViewDistance(this, player)) {
        if (!prevVisiblePlayers[id]) {
          this.addVisiblePlayer(player)
          player.addVisiblePlayer(this)
        }
      } else {
        if (!prevVisiblePlayers[id]) {
          this.addVisiblePlayer(player)
        }

        if (player.calculateEntityVisible(this) && !player.visiblePlayers[this.id]) {
          player.addVisiblePlayer(this)
        }
      }
    }
  }

  determineVisibleCorpses() {
    let prevVisibleCorpses = this.visibleCorpses

    let visibleCorpses = this.getVisibleCorpses()

    // visible before. hidden now.
    for (let id in prevVisibleCorpses) {
      if (!visibleCorpses[id]) {
        let corpse = prevVisibleCorpses[id]
        this.removeVisibleCorpse(corpse)
      }
    }

    // hidden before. visible now.
    for (let id in visibleCorpses) {
      if (!prevVisibleCorpses[id]) {
        let corpse = visibleCorpses[id]
        this.addVisibleCorpse(corpse)
      }
    }
  }

  addVisibleCorpse(corpse) {
    this.visibleCorpses[corpse.getId()] = corpse
    this.onVisibleCorpseAdded(corpse)
  }

  removeVisibleCorpse(corpse) {
    delete this.visibleCorpses[corpse.getId()]
    this.onVisibleCorpseRemoved(corpse)
  }

  addVisiblePlayer(player) {
    this.visiblePlayers[player.getId()] = player
    this.onVisiblePlayerAdded(player)
  }

  removeVisiblePlayer(player) {
    // cannot remove self
    if (player.getId() === this.getId()) return

    delete this.visiblePlayers[player.getId()]
    this.onVisiblePlayerRemoved(player)
  }

  onVisibleCorpseAdded(corpse) {
    corpse.addPlayerViewership(this)
    this.addChangedCorpses(corpse)
  }

  onVisibleCorpseRemoved(corpse) {
    corpse.removePlayerViewership(this)
    this.addRemovedCorpses(corpse)
  }

  onVisiblePlayerAdded(player) {
    player.addPlayerViewership(this)
    this.addChangedPlayers(player)
  }

  onVisiblePlayerRemoved(player) {
    player.removePlayerViewership(this)
    this.addRemovedPlayers(player)
  }

  sendChangedPlayersToClient() {
    if (Object.keys(this.changedPlayers).length > 0) {
      this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", { players: this.changedPlayers })
    }

    if (Object.keys(this.removedPlayers).length > 0) {
      this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", { players: this.removedPlayers })
    }

    this.clearChangedPlayers()
  }

  sendChangedCorpsesToClient() {
    if (Object.keys(this.changedCorpses).length > 0) {
      this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", { corpses: this.changedCorpses })
    }

    if (Object.keys(this.removedCorpses).length > 0) {
      this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", { corpses: this.removedCorpses })
    }

    this.clearChangedCorpses()
  }

  clearChangedPlayers() {
    this.changedPlayers = {}
    this.removedPlayers = {}
  }

  clearChangedCorpses() {
    this.changedCorpses = {}
    this.removedCorpses = {}
  }

  addChangedPlayers(entity) {
    // temp replacement solution for 09af920ee20c8d06ac82d33719aeabb7e5bd824c
    // maybe remove or fix properly in future
    if (isNaN(entity.x) || isNaN(entity.y)) return

    this.changedPlayers[entity.id] = entity
    this.sector.addChangedPlayers(this)
  }

  addRemovedPlayers(entity) {
    // temp replacement solution for 09af920ee20c8d06ac82d33719aeabb7e5bd824c
    // maybe remove or fix properly in future
    if (isNaN(entity.x) || isNaN(entity.y)) return

    this.removedPlayers[entity.id] = { id: entity.id, clientMustDelete: true }
    this.sector.addChangedPlayers(this)
  }

  addChangedCorpses(entity) {
    // temp replacement solution for 09af920ee20c8d06ac82d33719aeabb7e5bd824c
    // maybe remove or fix properly in future
    if (isNaN(entity.x) || isNaN(entity.y)) return

    this.changedCorpses[entity.id] = entity
    this.sector.addChangedPlayers(this)
  }

  addRemovedCorpses(entity) {
    // temp replacement solution for 09af920ee20c8d06ac82d33719aeabb7e5bd824c
    // maybe remove or fix properly in future
    if (isNaN(entity.x) || isNaN(entity.y)) return

    this.removedCorpses[entity.id] = { id: entity.id, clientMustDelete: true }
    this.sector.addChangedPlayers(this)
  }

  getVisiblePlayers() {
    let visible = {}

    for (let id in this.game.players) {
      let player = this.game.players[id]
      let isVisible = this.calculateEntityVisible(player)
      if (isVisible) {
        visible[player.getId()] = player
      }
    }

    return visible
  }

  getVisibleCorpses() {
    let visible = {}

    let corpses = this.sector.unitTree.search(this.getCameraBoundingBox())

    for (var i = 0; i < corpses.length; i++) {
      let corpse = corpses[i]
      let isVisible = this.calculateEntityVisible(corpse)
      if (isVisible) {
        visible[corpse.getId()] = corpse
      }
    }

    return visible
  }

  addPlayerViewership(player) {
    this.playerViewerships[player.getId()] = player
  }

  removePlayerViewership(player) {
    delete this.playerViewerships[player.getId()]
  }

  calculateEntityVisible(entity) {
    return this.isTileVisible(entity.getAbsoluteRow(), entity.getAbsoluteCol())
  }

  removeCorpseViewerships() {
    for (let id in this.visibleCorpses) {
      let corpse = this.visibleCorpses[id]
      corpse.removePlayerViewership(this)
    }
  }

  unregisterFromPlayerViewership() {
    for (let id in this.playerViewerships) {
      let player = this.playerViewerships[id]
      player.removeVisiblePlayer(this)
      player.removePlayerViewership(this)
    }
  }

  isTileVisible(row, col) {
    let tileKey = [row, col].join("-")
    return this.fovTileHits[tileKey]
  }

  recalculateFovIfHitPresent(hits) {
    if (this.isControllingGhost()) return

    for (var i = 0; i < hits.length; i++) {
      let hit = hits[i]
      if (this.isTileVisible(hit.row, hit.col)) {
        this.assignFov()
        break
      }
    }
  }

  repositionOnPlayerTree() {
    this.sector.removeEntityFromTreeByName(this, "players")
    this.sector.insertEntityToTreeByName(this, "players")
  }

  checkInteractables() {
    if (!this.getContainer().isSector()) return

    let relativeBox = this.getPaddedRelativeBox()
    const hits = this.getContainer().structureMap.hitTestTile(relativeBox)
    hits.forEach((hit) => {
      if (hit.entity) this.onHitEntity(hit.entity, hit)
    })
  }

  shouldSkipFov() {
    if (this.ghost) return true
    return this.skipFov
  }

  onHitEntity(entity, hit) {
    if (this.isControllingGhost()) return

    // does nothing by default
    if (entity.hasCategory("door") && entity.isAutomatic()) {
      if (!this.sector.isTutorial() && !entity.isOwnedBy(this)) return
      if (!entity.isHitPassable(hit)) return
      if (!entity.isOpen) {
        entity.openFor(3000)
      }
    }
  }

  onPlayerReady() {
    // we just got notified by client that they received connection
    this.isPlayerReady = true

    for (let tutorialName in this.tutorialIndex) {
      this.sendClientTutorialIndex(tutorialName)
    }

    this.requestNewChunks()
    this.sendAllRegions()
    this.sendCommandBlocks()

    this.game.globalSidebar.emitContentsToPlayer(this)
    this.game.sidebars[this.id].emitContentsToPlayer(this)
  }

  sendAllRegions() {
    for (let name in this.sector.regions) {
      let region = this.sector.regions[name]
      this.getSocketUtil().emit(this.getSocket(), "RegionUpdated", { region: region })
    }
  }

  sendCommandBlocks() {
    let fullJson = JSON.stringify(this.sector.commandBlock.toJson())
    this.getSocketUtil().emit(this.getSocket(), "CommandBlockUpdated", { fullJson: fullJson })
  }

  requestNewChunks() {
    if (!this.isPlayerReady) return

    if (this.isFirstFullChunkRequest && this.game.isMiniGame()) {
      this.isFirstFullChunkRequest = false
      return
    }

    let chunks = this.getVisibleChunks()

    // remove ones no longer visible
    for (let chunkId in this.chunkSubscriptions) {
      let chunk = this.chunkSubscriptions[chunkId]
      let isChunkNoLongerVisible = !chunks[chunk.getId()]
      if (isChunkNoLongerVisible) {
        chunk.removeSubscriber(this)
        delete this.chunkSubscriptions[chunkId]
      }
    }

    // add new ones
    for (let chunkId in chunks) {
      let chunk = chunks[chunkId]
      let isChunkVisibleBefore = this.chunkSubscriptions[chunkId]
      if (!isChunkVisibleBefore) {
        this.chunkSubscriptions[chunkId] = chunk

        chunk.addSubscriber(this)
        this.sector.addFullChunkRequest(chunk, this)
      }
    }
  }

  getChunkSubscriptions() {
    return this.chunkSubscriptions
  }

  getEntityDeltaJson(json, entity) {
    let subAttributes = ["id", "type"].concat(entity.getChangedAttributesList())

    let result = {}
    for (var i = 0; i < subAttributes.length; i++) {
      let subAttribute = subAttributes[i]
      result[subAttribute] = json[subAttribute]
    }

    return result
  }

  getDeltaJson(group, collection) {
    let result = {}

    for (let id in collection) {
      let entity = collection[id]
      let isPresentOnClient = this.clientState[group][id]
      if (entity.clientMustDelete) {
        result[id] = entity
        this.removeClientEntity(group, id)
      } else if (isPresentOnClient) {
        let entityInstance = this.game.getEntity(entity.id)
        if (entityInstance) {
          result[id] = this.getEntityDeltaJson(entity, entityInstance)
        } else {
          entity.clientMustDelete = true
          result[id] = entity
          this.removeClientEntity(group, id)
        }
      } else {
        result[id] = entity
        this.addClientEntity(group, id)
      }
    }

    return result
  }

  addClientEntity(group, id) {
    this.clientState[group][id] = true
  }

  removeClientEntity(group, id) {
    delete this.clientState[group][id]
  }

  getStaminaConsumptionThreshold(activityType) {
    let result = 0

    switch(activityType) {
      case "walk":
        result = 50
        break
      case "attack":
        result = 10
        break
      case "mine":
        result = 10
        break
    }

    return result
  }

  retrievePickups() {
    if (this.health === 0) return

    let pickups = this.sector.pickupTree.search(this.getBoundingBox())
    pickups.forEach((pickup) => {
      let isSuccessful = pickup.giveTo(this)
      if (isSuccessful) {
        this.getSocketUtil().emit(this.socket, "PlaySound", { id: Protocol.definition().SoundType.Pickup })

        this.game.triggerEvent("ItemPickup", {
          playerId: this.getId(),
          player: this.getName(),
          itemType: pickup.item.getTypeName(),
          count: pickup.item.getCount()
        })
      }
    })
  }

  onEquipmentStorageChanged(item, index, previousItem) {
    let equipmentItem = this.equipments.get(index)

    // ensure owned by player
    if (equipmentItem && equipmentItem.getOwner() !== this) {
      equipmentItem.setOwner(this)
    }

    if (index === Protocol.definition().EquipmentRole.Armor) {
      if (!equipmentItem) {
        // removed armor, reset dirt
        this.dirt = 0
      }

      let previousArmor = previousItem ? previousItem.getTypeName() : ""
      let currentArmor = equipmentItem ? equipmentItem.getTypeName() : ""

      this.game.triggerEvent("ArmorEquipChanged", {
          playerId: this.getId(),
          player: this.getName(),
          previous: previousArmor,
          current: currentArmor
      })

    }

    this.onStateChanged()
  }

  onItemCountChanged(item) {
    if (this.isPlayerReady && !this.isRemoved) {
      if (item.storage === this.inventory ||
          item === this.holdItem) {
        this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: item })
      }
    }
  }

  onLastUsedTimestampChanged(item) {
    if (this.isPlayerReady && !this.isRemoved) {
      if (item.storage === this.inventory) {
        this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: item })
      }
    }
  }

  syncGoldAmountToClient() {
    let data = { gold: this.gold }
    this.getSocketUtil().emit(this.getSocket(), "UpdateStats", data)
  }

  onInventoryStorageChanged(item, index) {
    if (this.isRemoved) return

    if (this.isPlayerReady) {
      let json
      if (!this.inventory.storage[index]) {
        json = { index: index, clientMustDelete: true }
      } else {
        json = item
      }

      this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: json })
    }

    let inventoryItem = this.inventory.get(index)

    let isEquipIndex = this.equipIndex === index
    if (isEquipIndex) {
      if (!inventoryItem) {
        this.setHandEquipment(null)
      } else if (inventoryItem !== this.getHandItem()) {
        this.setHandEquipment(inventoryItem)
      }
    }

    // ensure owned by player
    if (inventoryItem && inventoryItem.getOwner() !== this) {
      inventoryItem.setOwner(this)
    }

    if (inventoryItem && inventoryItem.isType("IronOre") && inventoryItem.count >= 10) {
      this.progressTutorial("main", 1)
      this.walkthroughManager.handle("mining")
    }

    if (inventoryItem && inventoryItem.isType("LeadPipe") && inventoryItem.count >= 1) {
      this.walkthroughManager.handle("lead_pipe")
    }

    if (inventoryItem && inventoryItem.isType("BloodBottle") && inventoryItem.count >= 1) {
      this.progressTutorial("main", 13)
    }

    if (inventoryItem && inventoryItem.isType("BloodPack") && inventoryItem.count >= 1) {
      this.progressTutorial("main", 14)
    }

    if (inventoryItem && inventoryItem.isType("Potato") && inventoryItem.count >= 1) {
      this.walkthroughManager.handle("grab_potatoes")
    }

    if (inventoryItem && inventoryItem.isType("IronBar") ) {
      if (inventoryItem.count >= 15) {
        this.progressTutorial("main", 3)
      }

      this.walkthroughManager.handle("craft_iron_bar")
    }

    if (inventoryItem && inventoryItem.isType("LiquidPipe")) {
      this.walkthroughManager.handle("craft_liquid_pipe")
    }

    if (inventoryItem && inventoryItem.isType("PlantFiber") && inventoryItem.count >= 5) {
      this.progressTutorial("main", 8)
    }

    if (inventoryItem && inventoryItem.isType("Cloth") && inventoryItem.count >= 2) {
      this.progressTutorial("main", 9)
    }

    if (inventoryItem && inventoryItem.isType("Bed") && inventoryItem.count >= 1) {
      this.progressTutorial("main", 10)
    }
  }

  sanitize(text) {
    text = xss(text)
    return text.replace(/(<([^>]+)>)/ig, '')
  }

  update(deltaTime) {
  }

  getSocketId() {
    return this.socket.id
  }

  initContants() {
    this.velocityP2Multiplier = 20
    this.MINE_INTERVAL = 300
  }

  canBeMuted() {
    return !this.isSectorOwner()
  }

  mute() {
    if (this.isMuted) return
    this.isMuted = true
    this.getTeam() && this.getTeam().onTeamChanged()
  }

  unmute() {
    if (!this.isMuted) return

    this.isMuted = false
    this.getTeam() && this.getTeam().onTeamChanged()
  }

  // should be in common
  initVariables() {
    this.isMuted = false
    this.isFlying = false
    this.releasedAction = true
    this.isFirstFullChunkRequest = true
    this.objectives = {}
    this.fovTileHits = {}
    this.visiblePlayers = {}
    this.playerViewerships = {}
    this.changedPlayers = {}
    this.removedPlayers = {}
    this.regions = {}

    this.visibleCorpses = {}
    this.changedCorpses = {}
    this.removedCorpses = {}

    this.lastChatTimestamp = 0
    this.screenshotTaken = 0
    this.container = this.sector
    this.resumeTimestamp = this.game.timestamp
    this.tameLimitErrorShown = this.game.timestamp
    this.changedRooms = {}
    this.buildingsPlaced = {}
    this.isAdminMode = debugMode
    this.isFirstRoom = true
    this.tutorialIndex = { main: 0, corpse: -1 }
    this.viewSubscriptions = {}
    this.activityCounter = {
      "walk": 0,
      "attack": 0,
      "mine": 0
    }

    this.teamRequests = {}

    this.PLAYER_STAT_ATTRIBUTES = ["oxygen", "hunger", "stamina", "gold"]

    this.chunkSubscriptions = {} // chunks ive explored/subscribed to

    this.lastActivityTime = Date.now()
    this.cameraFocusTarget = this
    this.isSleeping = false
    this.owner = this
    this.isPilot = false
    this.level = 0
    this.angle = -90 // default facing upwards

    this.lastMineTime = this.game.clock
    this.isInvulnerable = true
    this.oxygen = Constants.Player.oxygen

    this.lastProcessedInput = -1
    this.state = 0
    this.experience = 0
    this.score = 0
  }

  getTurnSpeed() {
    return 20
  }

  getTileCount() {
    return this.getConstants().stats.tileCount
  }

  getBodyProperties(x, y) {
    return {
      mass: 0,
      position: [x, y],
      fixedRotation: true,
      damping: 0,
      type: p2.Body.KINEMATIC
    }
  }

  getPickaxeBox(x = this.getX(), y = this.getY()) {
    const w = this.getWidth() * 3
    const h = this.getHeight() * 3
    const margin = Constants.tileSize / 2

    return {
      pos: {
        x: x - w/2 + margin,
        y: y - h/2 ,
      },
      w: w,
      h: h
    }
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Player
  }

  getAlliance() {
    return this.getTeam()
  }

  getCollisionMask() {
    return Constants.collisionGroup.Building
  }

  isReady() {
    return this.spawnPosition
  }

  setPositionFound(bool) {
    this.spawnPosition = { x: this.getX(), y: this.getY() }
  }

  onPressKeyChanged(pressedKey) {
    let char = String.fromCharCode(pressedKey).toLowerCase()

    this.game.triggerEvent("PlayerKeyboard", {
      playerId: this.id,
      player: this.getName(),
      key: char
    })
  }

  updateInput(data) {
    this.touchActivity()

    if (data.hasOwnProperty('controlKeys')) {
      // desktop control
      let actionKeyBitIndex = 5
      let prevActionOn = (this.controlKeys >> (actionKeyBitIndex - 1)) % 2 === 1

      this.controlKeys = data.controlKeys
      if (this.pressedKey !== data.pressedKey) {
        this.pressedKey = data.pressedKey
        this.onPressKeyChanged(this.pressedKey)
      }

      let currActionOff = (this.controlKeys >> (actionKeyBitIndex - 1)) % 2 === 0
      let isActionStopped = prevActionOn && currActionOff
      let isActionStarted = !prevActionOn && !currActionOff

      if (isActionStopped) {
        if (this.actTargetEntity && this.actTargetEntity.onActionReleased) {
          this.actTargetEntity.onActionReleased()
          this.actTargetEntity = null
        }

        this.releasedAction = true

        if (this.hasPendingItem()) {
          this.stopEquipmentAnimation()
          this.removePendingItem()
        }
      } else if (isActionStarted) {
        this.releasedAction = false
      }

      this.onDesktopControlKey()
    } else {
      // mobile control
      this.inputAngle = data.angle

      if (this.idle && !data.idle) {
        this.onMobileDirectionPressed(data.angle)
      }

      this.idle = data.idle


      this.updateTarget({ angle: data.angle, row: 0, col: 0 })
    }

    this.walkthroughManager.handle("movement", data)
  }

  onDesktopControlKey() {
    if (this.currentVent) {
      if (this.isDirectionKeysHeld()) {
        if (this.isLeftOrUp()) {
          this.goToPreviousVent()
        } else {
          this.goToNextVent()
        }
      }
    }
  }

  onMobileDirectionPressed(angle) {
    if (this.currentVent) {
      let isLeftOrUp = angle < 300 && angle > 150

      if (isLeftOrUp) {
        this.goToPreviousVent()
      } else {
        this.goToNextVent()
      }
    }
  }

  isLeftOrUp() {
    return this.controlKeys & Constants.Control.left ||
           this.controlKeys & Constants.Control.up
  }

  goToPreviousVent() {
    let ventList = Object.values(this.sector.undergroundVents)
    let firstVent = ventList[0]
    let lastVent = ventList[ventList.length - 1]
    let targetVent

    for (var i = 0; i < ventList.length; i++) {
      let vent = ventList[i]
      if (vent === this.currentVent) {
        if (i === 0) {
          targetVent = lastVent
          break
        } else {
          targetVent = ventList[i - 1]
          break
        }
      }
    }

    if (targetVent) {
      targetVent.hideInVent(this)
    }

  }

  goToNextVent() {
    let ventList = Object.values(this.sector.undergroundVents)
    let firstVent = ventList[0]
    let lastVent = ventList[ventList.length - 1]
    let targetVent

    for (var i = 0; i < ventList.length; i++) {
      let vent = ventList[i]
      if (vent === this.currentVent) {
        if (i === (ventList.length - 1)) {
          targetVent = firstVent
          break
        } else {
          targetVent = ventList[i + 1]
          break
        }
      }
    }

    if (targetVent) {
      targetVent.hideInVent(this)
    }

  }

  setCurrentVent(vent) {
    this.currentVent = vent
  }

  getLevel() {
    return this.ship ? this.ship.level : this.level
  }

  respawn() {
    if (this.dragger) {
      this.dragger.unsetDragTarget()
    }

    this.setHealth(this.getMaxHealth())
    this.setUserOxygen(this.getMaxOxygen())
    this.setStamina(this.getMaxStamina())

    this.initClientState()

    this.game.triggerEvent("PlayerRespawn", {
      playerId: this.id,
      player: this.getName()
    })

    let spawnPoint = this.getSpawnPosition()
    if (spawnPoint) {
      this.repositionTo(spawnPoint.x, spawnPoint.y)
      return
    }

    let beacon = this.getTeam() && this.getTeam().getRandomBeacon()
    if (beacon) {
      this.repositionTo(beacon.getX(), beacon.getY())
    } else {
      let position = this.getRespawnPosition()
      this.repositionTo(position.x, position.y)
    }
  }

  getSpawnPosition() {
    let teamId = this.getTeam() && this.getTeam().id
    let teamSpawnPoints = this.sector.spawnPoints["team-" + teamId]
    if (teamSpawnPoints && Object.keys(teamSpawnPoints).length > 0) {
      let spawnPoints = Object.values(teamSpawnPoints)
      let index = Math.floor(Math.random() * spawnPoints.length)
      let spawnPoint = spawnPoints[index]
      return spawnPoint
    }

    let roleId = this.getRole() && this.getRole().id
    let roleSpawnPoints = this.sector.spawnPoints["role-" + roleId]
    if (roleSpawnPoints && Object.keys(roleSpawnPoints).length > 0) {
      let spawnPoints = Object.values(roleSpawnPoints)
      let index = Math.floor(Math.random() * spawnPoints.length)
      let spawnPoint = spawnPoints[index]
      return spawnPoint
    }

    let beacons = this.getTeam() && this.getTeam().getBeacons()
    let beaconsForEveryone = beacons.filter((beacon) => {
      return beacon.content === 'everyone' || !beacon.content
    })

    if (beaconsForEveryone.length > 0) {
      let index = Math.floor(Math.random() * beaconsForEveryone.length)
      let beacon = beaconsForEveryone[index]
      return { x: beacon.getX(), y: beacon.getY() }
    }

    return null
  }

  enterBuildMode() {
    this.controlKeys = 0

    if (this.ship) {
      this.ship.setAngle(0)
    } else {
      this.angle = 0
    }
  }

  respawnIfReady() {
    if (!this.respawnTime || (this.game.clock > this.respawnTime)) {
      if (this.game.isPvP()) {
        this.sector.findNewTeamSpawn([this])
      }

      this.respawn()
    }
  }

  wakeupOnFullStamina() {
    if (this.stamina === this.getMaxStamina()) {
      this.wakeup()
    }
  }

  progressTutorial(name, index) {
    if (this.isDoingTutorial() && this.tutorialIndex[name] === index) {
      this.tutorialIndex[name] += 1
      this.sendClientTutorialIndex(name)
    }
  }

  sendClientTutorialIndex(name) {
    this.getSocketUtil().emit(this.getSocket(), "SetTutorialIndex", {
      name: name,
      tutorialIndex: this.tutorialIndex[name]
    })
  }


  // away from keyboard: disconnect after 15 minutes
  isAFKTimeLimitExceeded() {
    if (debugMode) return false
    let numMinutes = 10
    if (this.game.isMiniGame()) {
      numMinutes = this.sector.miniGame.getAFKLimit()
    }
    return Date.now() - this.lastActivityTime > (1000 * 60 * numMinutes)
  }

  closeSocket() {
    if (this.isConnected()) {
      this.getSocket().close()
    }
  }

  isBot() {
    // created by load testing bot
    return this.name.match(/^@bot_\w{10}/)
  }

  removeInvulnerability() {
    if (!this.isInvulnerable) return

    let currentSessionDuration = this.game.timestamp - this.resumeTimestamp
    if (currentSessionDuration > (Constants.physicsTimeStep * 5)) {
      this.isInvulnerable = false
    }
  }

  isUsingMobileControls() {
    return typeof this.inputAngle !== 'undefined'
  }

  setIsWorking(isWorking) {
    this.isWorking = isWorking
    this.onStateChanged("isWorking")
  }

  pauseItemCountdown() {
    let item = this.getItemWithCooldown()
    if (item && item.lastUsedTimestamp) {
      item.lastUsedTimestamp += 1
      // used timestamp moves along with every tick
      this.isItemCountdownPaused = true
    }
  }

  resumeItemCountdown() {
    let item = this.getItemWithCooldown()
    if (item) {
      this.onLastUsedTimestampChanged(item)
    }
  }

  getItemWithCooldown() {
    let item = this.inventory.search(Protocol.definition().BuildingType.AssassinsKnife)
    return item
  }

  executeOnPause() {
    if (this.game.shouldCooldownPause) {
      this.pauseItemCountdown()
    }
  }

  move(deltaTime) {
    if (this.isAFKTimeLimitExceeded()) {
      this.getSocketUtil().emit(this.getSocket(), "AFK", {})
      this.closeSocket()
      this.remove()
      return
    }

    if (this.currentVent || this.game.shouldCooldownPause) {
      this.pauseItemCountdown()
    } else if (this.isItemCountdownPaused) {
      this.isItemCountdownPaused = false
      this.resumeItemCountdown()
    }

    this.consumeDrug()
    this.consumeItem()
    this.consumeFood()
    this.consumeFire()
    this.consumePoison()
    this.consumeOxygen()
    this.consumeHunger()
    this.consumeFear()
    this.consumeMiasma()
    this.consumeSpin()
    this.consumeDrunk()
    this.consumeHaste()
    this.consumeInvisible()
    this.consumeRage()
    this.consumeParalyze()
    this.consumeWeb()
    this.removeInvulnerability()

    this.aliveDurationInTicks = this.getAliveDurationInTicks()

    if (this.isDormant) return

    if (this.isDestroyed() && !this.isControllingGhost()) {
      return
    }

    if (this.isControllingGhost() || this.isCustomVelocity) {
      // reset velocity to 0, no acceleration
      this.body.velocity[0] = 0
      this.body.velocity[1] = 0
    }


    let cameraTarget = this.getCameraFocusTarget()
    if (!cameraTarget.body) return

    this.performRepair()

    if (this.isPilot) return // let ship handle movement based on players moveEntity logic
    if (this.isWorking) return

    let velocity
    if (this.isBot()) {
      if (!this.lastRandomVelocity || (Date.now() - this.lastRandomVelocity > 5000)) {
        let choices = [-8,0,8]
        let randomVx = choices[Math.floor(Math.random() * choices.length)]
        let randomVy = choices[Math.floor(Math.random() * choices.length)]
        velocity = [randomVx, randomVy]
        this.lastBotVelocity = velocity
        this.lastRandomVelocity = Date.now()
      } else {
        velocity = this.lastBotVelocity
      }
    } else if (this.isUsingMobileControls()) {
      if (this.idle) {
        velocity = [0, 0]
      } else {
        velocity = this.getTargetVelocityFromAngle(this.inputAngle)
      }
    } else {
      velocity = this.getTargetVelocityFromControls(this.controlKeys)
      if (this.sector.hasGravity() && velocity[1] < 0) {
        // apply force instead of gravity
        this.jump()

        if (!this.isFlying) {
          velocity[1] = 0
        }
      }
    }

    if (this.isSleeping) {
      if (vec2.length(velocity) > 0) {
        this.wakeup()
      } else {
        this.increaseStamina()
        this.wakeupOnFullStamina()
      }
      return
    }


    if (this.isCameraMode()) {
      this.moveCamera(velocity)
      return
    }

    this.applyVelocity(cameraTarget.body, velocity)

    if (this.isControllingPlayer()) {
      // can only feed if im controlling my body
      const item = this.getActiveItem()
      if (item ) {
        this.attemptFeed(item)
      }
    }
  }

  isControllingGhost() {
    return this.cameraFocusTarget instanceof Mobs.Ghost
  }

  isControllingPlayer() {
    return this.cameraFocusTarget instanceof Player
  }

  applyGravity() {
    if (!this.sector.hasGravity()) return
    if (this.isFlying) return

    let maxFallSpeed = 20
    let gravity = this.sector.gravity
    this.body.velocity[1] += gravity
    this.body.velocity[1] = Math.min(maxFallSpeed, this.body.velocity[1])
  }

  jump() {
    if (this.canJump || this.mounted) {
      let direction = -1
      this.applyForce([0, this.sector.jumpPower * direction])
      this.canJump = false
    }
  }

  getMaxSpeedFromForce() {
    if (this.sector.hasGravity()) {
      return 30
    } else {
      return super.getMaxSpeedFromForce() * this.getSpeedMultiplier()
    }
  }


  isTameLimitReached(increment = 0) {
    return (this.getTameCount() + increment) > this.getTameLimit()
  }

  getTeamApprovedMember() {
    if (this.hasMemberPrivilege()) {
      return this
    } else {
      return this.getTeam().getRandomApprovedMember()
    }
  }

  setIsAngleLocked(isAngleLocked) {
    this.isAngleLocked = isAngleLocked
    this.onStateChanged("isAngleLocked")
  }

  performRepair() {
    if (!this.repairTarget) return

    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep) === 0
    if (!isOneSecondInterval) return

    this.repairTarget.setHealth(this.repairTarget.health + 10)
    this.sendEquipmentAnimation()

    if (this.repairTarget.getHealth() === this.repairTarget.getMaxHealth()) {
      // fully repaired.
      this.game.triggerEvent("BuildingRepaired", { entityId: this.repairTarget.getId(), actorId: this.getId() })
      this.removeRepairTarget()
    }
  }

  getTameCount() {
    return Object.keys(this.getOwnerships("tames")).length
  }

  getTameLimit() {
    return debugMode ? 2 : 5
  }

  attemptFeed(item) {
    let mobs = this.sector.mobTree.search(this.getFeedBoundingBox())

    mobs.forEach((mob) => {
      mob.feed(this, item)
    })
  }

  hasFollower() {
    return this.follower
  }

  setFollower(entity) {
    this.follower = entity
  }

  takeAlong(data) {
    let entity = this.game.getEntity(data.id)
    if (entity) {
      entity.takeAlong(this)
    }
  }

  release(data) {
    let entity = this.game.getEntity(data.id)
    if (entity) {
      entity.release(this)
    }
  }

  moveCamera(velocity) {
    this.getCamera().position[0] += (velocity[0] * this.getCameraVelocityMultiplier())
    this.getCamera().position[1] += (velocity[1] * this.getCameraVelocityMultiplier())
  }

  getCameraVelocityMultiplier() {
    return 2.5
  }

  getCamera() {
    this.camera = this.camera || new Camera()
    return this.camera
  }

  isCameraMode() {
    return this.cameraFocusTarget instanceof Camera
  }

  consumeStamina(activityType) {
    if (this.sector.settings['isStaminaEnabled'] === false) return

    this.activityCounter[activityType] += 1
    if (this.activityCounter[activityType] > this.getStaminaConsumptionThreshold(activityType)) {
      this.setStamina(this.stamina - 1)
      this.activityCounter[activityType] = 0
    }
  }

  increaseStamina() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (this.isWearingOxygenArmor()) {
      this.setStamina(this.stamina + 1)
    } else {
      this.setStamina(this.stamina + 3)
    }
  }

  isWearingOxygenArmor() {
    let armorEquipment = this.getArmorEquipment()
    return armorEquipment && armorEquipment.hasOxygen()
  }

  consumeDrug() {
    if (!this.activeDrug) return

    let drugInterval = Constants.physicsTimeStep * 8 // 8 seconds
    let drugIntervalReached = (this.game.timestamp - this.lastDrugConsumeTimestamp) > drugInterval
    if (drugIntervalReached) {
      this.removeActiveDrug()
    }
  }

  consumeItem() {
    if (!this.pendingItem) return

    let isItemReadyForConsumption = this.game.timestamp > this.pendingItemReadyTimestamp
    if (isItemReadyForConsumption) {
      this.pendingItem.use(this)
      this.removePendingItem()
    }
  }

  consumeFood() {
    if (!this.activeFood) return
    if (this.isDestroyed()) {
      this.removeActiveFood()
      return
    }

    let activeFoodKlass = this.activeFood.getKlass(this.activeFood.type)

    const foodUsageTotalDuration = activeFoodKlass.prototype.getFoodUsageTotalDuration()
    const foodUsageInterval = 3
    const foodUtilityTimestampDuration = Constants.physicsTimeStep * foodUsageTotalDuration
    const foodUsageIterationCount = Math.floor(foodUsageTotalDuration / foodUsageInterval)

    if (this.isFoodDigested) {
      const isTwoSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 2) === 0
      if (!isTwoSecondInterval) return
    }

    let foodUtilityExpired = (this.game.timestamp - this.lastFoodConsumeTimestamp) > foodUtilityTimestampDuration
    if (foodUtilityExpired) {
      this.removeActiveFood()
    } else {
      if (this.activeFood.isFood()) {
        let foodValue = activeFoodKlass.prototype.getFoodValue()
        let foodValuePerIncrement = Math.floor(foodValue / foodUsageIterationCount)

        this.setHealth(this.getHealth() + foodValuePerIncrement)
      }

      this.isFoodDigested = true
      this.onFoodEaten(this.activeFood)
    }
  }

  onFoodEaten(activeFood) {
    if (activeFood.getTypeName() === "HumanMeat" ||
        activeFood.getTypeName() === "LectersDinner") {
      this.getTeam().addDeed("cannibalism")

      this.cannibalismCount = this.cannibalismCount || 0
      this.cannibalismCount += 1

      if (this.cannibalismCount > 10) {
        this.getTeam().addDeed("extreme_cannibalism")
        this.cannibalismCount = 0
      }
    }
  }

  consumeRage() {
    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 5) === 0
    if (!isFiveSecondInterval) return

    if (!this.hasEffect("rage")) return

    let effectDuration = this.game.timestamp - this.getEffectCreatedAt("rage")
    let effectDurationInSeconds = Math.floor(effectDuration / Constants.physicsTimeStep)

    if (effectDurationInSeconds >= 60) {
      this.removeRage()
    }
  }

  forceOxygenConsumption() {
    this.forceConsumeOxygen = true
  }

  consumeOxygen() {
    if (!this.sector.settings["isOxygenEnabled"]) return

    if (this.forceConsumeOxygen) {
      this.forceConsumeOxygen = false
    } else {
      const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * Constants.oxygenProductionConsumptionRate) === 0
      if (!isThreeSecondInterval) return
    }

    // check platform
    let platform = this.getStandingPlatform()
    if (platform && this.getContainer().isSector()) {
      let isOnOxygenatedPlatform = platform.room && platform.room.isOxygenated

      if (isOnOxygenatedPlatform) {
        platform.room.consumeOxygen(this)
        this.setUserOxygen(this.getOxygen() + 1)
        return
      }

      // check door
      const structureHits = this.getContainer().structureMap.hitTestTile(this.getBox())
      const structureHit = structureHits.find((hit) => { return hit.entity } )
      const isDoor = structureHit && structureHit.entity && structureHit.entity.hasCategory("door")
      const room = isDoor && structureHit.entity.getConnectedRooms()[0]
      const isOnOxygenatedDoor = isDoor && room && room.isOxygenated

      if (isOnOxygenatedDoor) {
        room.consumeOxygen(this)
        this.setUserOxygen(this.getOxygen() + 1)
        return
      }
    }


    this.setUserOxygen(this.getOxygen() - 1)

    if (this.getOxygen() <= 0) {
      this.damage(10)
    }
  }

  setUserOxygen(oxygen) {
    const armor = this.getArmorEquip()
    if (armor) {
      armor.setOxygen(oxygen, this)
    } else {
      this.setOxygen(oxygen)
    }
  }

  getHunger() {
    return this.hunger
  }

  getStamina() {
    return this.stamina
  }

  getOxygen() {
    const armor = this.getArmorEquip()
    if (armor && armor.hasOxygen()) {
      return armor.oxygen
    } else {
      return this.oxygen
    }
  }

  moveEntity(targetEntityToMove, deltaTime) {
    // todo: to implement, need to handle mobile controls (inputAngle, idle)

    // const angleDelta     = targetEntityToMove.getAngleDeltaFromControls(targetEntityToMove, this.controlKeys)
    // const force = targetEntityToMove.getForceFromControls(this.controlKeys, deltaTime)
    // targetEntityToMove.applyForce(force)
    // targetEntityToMove.setAngle(targetEntityToMove.angle + angleDelta)
  }

  getSpeedMultiplier() {
    if (this.hasEffect('fear')) return 0.7
    if (this.hasEffect('haste')) return 1.5
    return 1
  }

  applyVelocity(body, targetVelocity, deltaTime) {
    if (this.isControllingGhost()) {
      vec2.scale(body.velocity, targetVelocity, 1)
      return
    }

    const platform = this.getStandingPlatform()

    let multiplier = platform ? platform.getSpeedMultiplier() : 1
    let playerSpeedMultiplier = this.getSpeedMultiplier()
    let totalMultiplier = multiplier * playerSpeedMultiplier

    if (platform || this.sector.hasGravity()) {
      vec2.scale(body.velocity, targetVelocity, totalMultiplier) // player velocity is immediately applied instead of lerped
    } else {
      // no platform
      vec2.scale(targetVelocity, targetVelocity, totalMultiplier)
      if (this.isMoving()) {
        let armor = this.getArmorEquip()
        if (armor) {
          this.accelerate(body, targetVelocity, this.getMaxSpeed() * totalMultiplier)
        } else {
          this.accelerate(body, targetVelocity, this.getMaxSpeed() * totalMultiplier * 0.75)
        }
      }
    }
  }

  dampenVelocity() {
    const platform = this.getStandingPlatform()
    if (platform) {
      super.dampenVelocity()
    } else {
      if (!this.isMoving()) {
        super.dampenVelocity(0.9)
      }
    }
  }

  isMoving() {
    if (this.isUsingMobileControls()) {
      return !this.idle
    } else {
      return this.isDirectionKeysHeld()
    }
  }

  setArmorItem(item) {
    this.equipments.storeAt(Protocol.definition().EquipmentRole.Armor, item)
  }

  getArmorItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Armor)
  }

  retrieveArmorItem() {
    return this.equipments.retrieve(Protocol.definition().EquipmentRole.Armor)
  }

  getArmorEquip() {
    const item = this.equipments.get(Protocol.definition().EquipmentRole.Armor)
    return item && item.instance
  }

  getHandItem() {
    return this.equipments.get(Protocol.definition().EquipmentRole.Hand)
  }

  getHandEquip() {
    let item = this.equipments.get(Protocol.definition().EquipmentRole.Hand)
    return item && item.instance
  }

  retrieveHandItem() {
    return this.equipments.retrieve(Protocol.definition().EquipmentRole.Hand)
  }

  getJumpVelocityMultiplier() {
    return 2.2
  }

  canAct() {
    if (this.isDormant) return false
    if (this.game.shouldPause) return false

    const currentTime = this.game.clock

    if (this.itemSwitchAllowActionTime) {
      if (currentTime > this.itemSwitchAllowActionTime) {
        // seconds delay after switching weapons
        this.itemSwitchAllowActionTime = null
        return true
      } else {
        return false
      }
    }

    let activeItem = this.getActiveItem()

    if (!activeItem) {
      return currentTime - this.lastActionTime > this.getActionInterval()
    }

    return activeItem.canUseImmediately(this)
  }

  resetFlags() {
  }

  // for pathfinder to treat player target as platform
  getTileType() {
    return Buildings.SteelFloor.getType()
  }

  upgradeBuilding(data) {
    if (!this.ship) return

    const building = this.ship.getPlatform(data) || this.ship.getBuilding(data) || this.ship.getUnit(data)
    if (!building) return

    const cost = building.getUpgradeCost()
    if (!cost) return

    const hasEnoughResourceToBuild = this.hasEnoughResourcesFor(cost)
    if (!hasEnoughResourceToBuild) return

    const isAlreadyOneLevelGreaterThanShipCore = building.level > this.ship.shipCore.level
    if (isAlreadyOneLevelGreaterThanShipCore) return

    if (building.isMaxUpgradeReached()) return

    building.increaseLevel()
  }

  increaseLevel() {
    this.level += 1
  }

  isBuildingAllowedInGame(buildingKlass) {
    if (this.game.isPvP()) {
      let notAllowedList = ["Atm", "RailStop", "RailTrack"]
      if (notAllowedList.indexOf(buildingKlass.name) !== -1) {
        return false
      }
    }

    if (this.game.isHardcore()) {
      let notAllowedList = ["Atm"]
      if (notAllowedList.indexOf(buildingKlass.name) !== -1) {
        return false
      }
    }

    return true
  }

  getRegionRestrictFlag(x, y, w, h) {
    let boundingBox = {
      minX: x - w/2,
      minY: y - h/2,
      maxX: x + w/2,
      maxY: y + w/2
    }

    let regions = this.sector.regionTree.search(boundingBox)
    if (regions.length === 0) return null

    let region = regions[0]
    return region.getFlag("restrict")
  }

  getRegionBuildPermission(x, y, w, h) {
    let padding = 1
    let boundingBox = {
      minX: x - w/2 + padding,
      minY: y - h/2 + padding,
      maxX: x + w/2 - padding,
      maxY: y + w/2 - padding
    }

    let regions = this.sector.regionTree.search(boundingBox)
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

  canBuildInRegion(buildFlag) {
    if (buildFlag === 'everyone') return true

    let isTeamRestricted = this.game.getTeamByName(buildFlag)
    let isRoleRestricted = this.getTeam().getRoleByName(buildFlag)

    if (isTeamRestricted) {
      if (!this.getTeam()) return false
      return this.getTeam().name === buildFlag
    }

    if (isRoleRestricted) {
      if (!this.getRole()) return false
      return this.getRole().name === buildFlag
    }

    // username restricted
    return this.name === buildFlag
  }

  // data.x,y are absolute coordinates
  // if blocksize is 1 tile  - data.x,y is center
  // if blocksize is 4 tiles - data.x,y is center

  build(data) {
    if (!this.isControllingPlayer()) return null

    const buildContainer = this.game.getEntity(data.containerId)
    if (!buildContainer) return null

    let buildingKlass = Buildings.forType(data.type)
    if (!buildingKlass) {
      buildingKlass = Terrains.forType(data.type)
      if (buildingKlass && !this.isSectorOwner()) {
        this.showError("Permission Denied")
        return null
      }
    }

    if (!buildingKlass) {
      return null
    }

    if (!this.isBuildingAllowedInGame(buildingKlass)) return null

    const item = this.inventory.search(buildingKlass.getType())
    if (!item) return null

    let w = data.w || buildingKlass.getRotatedWidth(data.angle)
    let h = data.h || buildingKlass.getRotatedHeight(data.angle)

    if (this.getTeam().isBuildLimitReached(buildingKlass, 1)) {
      this.showError("Max limit reached for " + buildingKlass.name, { isWarning: true })
      return null
    }

    if (!buildingKlass.prototype.isCoordValid(buildContainer, data.x, data.y)) {
      return null
    }

    let byPassRoleBuildPermission

    let regionBuildPermission = this.getRegionBuildPermission(data.x, data.y, w, h)
    if (regionBuildPermission) {
      if (!this.canBuildInRegion(regionBuildPermission)) {
        this.showError("Only " + regionBuildPermission + " can build in this region")
        return null
      }

      byPassRoleBuildPermission = true
    }

    if (this.getRole()) {
      let canBuild = this.getRole().isAllowedTo("Build") || byPassRoleBuildPermission
      let ownerOnly = ["UnbreakableWall"]
      if(ownerOnly.indexOf(buildingKlass.prototype.getTypeName()) != -1) {
        if(!this.isSectorOwner()) {
          this.showError("Only owner can place", {isWarning: true})
          return null
        }
      }
      if (buildingKlass.prototype.isCrop()) {
        if (canBuild && !this.getRole().isAllowedTo("PlantSeeds")) {
        this.showError("Permission Denied")
        return null
        }
      } else if (!canBuild) {
        this.showError("You dont have building permissions")
        return null
      }
    }

    if (buildingKlass.isPositionValid(buildContainer, data.x, data.y, w, h, data.angle, this, data.type, this.colorIndex, this.textureIndex)) {
      data.owner = this.getBuildOwner()
      data.placer = this
      data.buildProgress = 0
      data.isPlacedByPlayerAction = true

      let building = buildingKlass.build(data, buildContainer)
      if (!building) return
      this.addBuildingsPlaced(building)
      building.addBuildActivity(this)

      if (building.hasCustomColors()) {
        if (this.colorIndex >= 0) {
          building.setColorIndex(this.colorIndex)
        }

        if (this.textureIndex >= 0) {
          building.setTextureIndex(this.textureIndex)
        }
      }

      if (building.hasCategory("editable_permissions")) {
        if (this.lastCustomAccess && this.lastCustomAccess.type === building.type) {
          building.setIsCustomAccess(true)
          building.setAccessType(this.lastCustomAccess.accessType)
        }
      }

      if (building.hasCategory("lamp")) {
        if (this.lastLampContent) {
          building.setBuildingContent(this.lastLampContent)
        }
      }

      this.game.triggerEvent("BuildingPlaced", {
        entityId: building.getId(),
        entityType: building.getTypeName(),
        player: this.getName(),
        playerId: this.getId()
      })

      item.consume()
      return building
    }

    return null
  }

  addBuildingsPlaced(building) {
    this.buildingsPlaced[building.getId()] = building
  }

  removeAllBuildingsPlacedInfo() {
    for (let id in this.buildingsPlaced) {
      let building = this.buildingsPlaced[id]
      building.placer = null
      delete this.buildingsPlaced[id]
    }
  }

  setTeam(team) {
    let oldTeam = this.team
    this.team = team
    if (oldTeam !== team) {
      this.onTeamAssignmentChanged()
    }
  }

  onTeamAssignmentChanged() {
    this.getSocketUtil().emit(this.getSocket(), "TeamAssignmentChanged", {
      roles: this.getTeam().roles
    })
  }

  getBuildOwner() {
    let team = this.getJoinableTeam()
    if (team) {
      return team
    } else {
      return this
    }
  }

  hasBuildingRequirements(klass) {

  }

  updateTarget(data) {
    this.touchActivity()

    if (!this.isAngleLocked) {
      this.setAngle(data.angle)
    }

    this.setMouseCoord(data)

    this.updateDragTargetPosition()
    this.updateMountAngle()
  }

  updateMountAngle() {
    if (this.mounted && this.mounted.shouldUpdatePosition()) {
      this.mounted.setAngle(this.angle)
    }
  }

  setMouseCoord(data) {
    let prevMouseRow = this.mouseRow
    let prevMouseCol = this.mouseCol

    if (data.hasOwnProperty("row")) {
      this.mouseRow = data.row
    }

    if (data.hasOwnProperty("col")) {
      this.mouseCol = data.col
    }

    if (prevMouseRow !== this.mouseRow || prevMouseCol !== this.mouseCol) {
      this.onMouseCoordChanged()
    }
  }

  onMouseCoordChanged() {
    if (this.lastRoomHovered) {
      let isHoveringSameRoom = this.lastRoomHovered.hasTile(this.mouseRow, this.mouseCol)
      if (isHoveringSameRoom) {
        return
      }
    }

    let room = this.sector.getRoom(this.mouseRow, this.mouseCol)
    this.lastRoomHovered = room
    this.onRoomHoveredChanged()
  }

  onRoomHoveredChanged() {
    let roomId = this.lastRoomHovered ? this.lastRoomHovered.id : 0
    this.getSocketUtil().emit(this.getSocket(), "RoomHovered", { id: roomId })
  }

  onAngleChanged() {
    super.onAngleChanged()

    if (this.getHandEquip()) {
      this.getHandEquip().onOwnerAngleChanged(this)
    }
  }

  touchActivity() {
    this.lastActivityTime = Date.now()
  }

  debugRoom(data) {
    let platform = this.game.getEntity(data.id)
    if (platform && platform.room) {
      this.renderRoomPressureNetwork(platform.room)
    }
  }

  interactTarget(data) {
    this.touchActivity()

    if (this.isDestroyed()) return

    if (this.currentVent) {
      this.currentVent.unhideFromVent(this)
      return
    }

    let action = data.action
    let content = data.content
    let entity = this.game.getEntity(data.id)
    if (!entity) return
    if (entity.isPlayerData()) { // dunno why this happens but lets just add failsafe for now
      return
    }

    if (!this.isCameraMode && !Helper.isTargetWithinRange(this.getCameraFocusTarget(), entity)) return

    if (this.isControllingGhost()) {
      // can only possess mobs/player
      if (entity.isPlayer() || entity.isMob()) {
        this.possess(entity)
      }
    } else {
      if (typeof entity.isBuilding !== 'function') {
        this.game.captureException(new Error("[" + entity.constructor.name + "] entity.isBuilding not function"))
        return
      }
      if (entity.isBuilding()) {
        if (entity.isInteractDisabled(this)) return
        if (this.game.distanceBetween(this, entity) >= entity.getInteractDistance()) {
          this.showError("Too far", { isWarning: true })
          return false
        }

        entity.interact(this, action, content)

        let data = {
          entityId: entity.id,
          entityType: entity.getTypeName(),
          playerId: this.id,
          player: this.name
        }

        if (this.sector.miniGame && this.sector.miniGame.name === 'find_the_imposter') {
          data.action = action || ""
        }

        this.game.triggerEvent("InteractBuilding", data)
      } else {
        if (entity.canBeInteracted()) {
          entity.interact(this)
        }
      }
    }
  }

  showError(message, options = {}) {
    message = i18n.t(this.locale, message)
    options.message = message
    this.getSocketUtil().emit(this.getSocket(), "ErrorMessage", options)
  }

  showChatError(message) {
    this.getSocketUtil().emit(this.getSocket(), "ServerChat", { message: "%error%" + message })
  }

  showChatSuccess(message) {
    this.getSocketUtil().emit(this.getSocket(), "ServerChat", { message: "%success%" + message })
  }

  possess(entity) {
    if (this.possessId) {
      // unpossess
      let entity = this.game.getEntity(this.possessId)
      if (entity) {
        entity.setDormant(false)
      }
      this.possessId = null
    }

    if (entity.isPlayer()) {
      if (!entity.isDestroyed() && entity === this) {
        this.setCameraFocusTarget(entity)
        this.ghost.remove()
        this.ghost = null
      }
    } else if (entity.isMob()) {
      if (entity.isObedient() && !entity.isDestroyed() && !entity.isGhost()) {
        entity.setDormant(true)
        this.possessId = entity.getId()
        this.setCameraFocusTarget(entity)
        this.ghost.remove()
        this.ghost = null
      }
    }

  }

  setDormant(isDormant) {
    this.isDormant = isDormant
  }

  interact(user) {
    const item = user.getActiveItem()
    if (item && item.isSyringe()) {
      item.use(user, this)
    } else if (this.isDestroyed()) {
      user.attemptDrag(this)
    }
  }

  drainSample() {
    let damage = Math.floor(this.getMaxHealth() / 3)
    this.damage(damage)
    return this.constructor.name
  }

  attemptDrag(mob) {
    if (!this.getContainer().isSector()) return
    if (this.game.isMiniGame()) {
      if (mob.isCorpse() && mob.getMobKlass().name === 'Human') {
        return
      }
    }

    if (this.dragTarget === mob) {
      this.releaseDragTarget()
    } else {
      this.setDragTarget(mob)
    }
  }

  onEntityRemoved(event) {
    let entity = event.target

    // clean placedBuildings
    delete this.buildingsPlaced[entity.getId()]

    if (this.initialEscapePod === entity) {
      this.initialEscapePod = null
    }

    if (this.core === entity) {
      this.core = null
    }
  }

  toBlueprintJson() {
    let json = this.toJson()
    delete json["id"]
    return json
  }

  startWave() {
    this.wave = this.sector.getWaveForPlayer(this)
    this.wave.onWaveComplete() // hack. it just sets a timer for incoming wave
  }

  hasMiningEquipment() {
    const itemData = this.getActiveItem()
    return Item.isMiningEquipment(itemData)
  }

  mine(data) {
    if (!this.canAct()) return
    if (this.isDestroyed()) return

    let handEquipment = this.getHandEquipment()
    if (!handEquipment) return
    if (!handEquipment.isMiningEquipment()) return

    let mineable = this.sector.getMineable(data.row, data.col)
    if (!mineable) return

    if (!Helper.isTargetWithinRange(this.getCameraFocusTarget(), mineable)) return

    this.lastActionTime = this.game.clock

    this.consumeStamina("mine")

    handEquipment.use(this, mineable)
  }

  retrieveMinerals(data) {

  }

  setActiveFood(item) {
    this.activeFood = item
    this.lastFoodConsumeTimestamp = this.game.timestamp
  }

  setActiveDrug(drug) {
    this.activeDrug = drug
    this.lastDrugConsumeTimestamp = this.game.timestamp
  }

  removeActiveDrug() {
    this.activeDrug = null
  }

  hasActiveDrug() {
    return this.activeDrug
  }

  hasActiveFood() {
    return this.activeFood
  }

  hasPendingItem() {
    return this.pendingItem
  }

  removeActiveFood() {
    this.activeFood = null
    this.isFoodDigested = false
  }

  emit(eventName, data) {
    this.getSocketUtil().emit(this.socket, eventName, data)
  }

  canDamage(target) {
    if (this.getRole() && !this.getRole().isAllowedTo("DamagePvpPlayers")) {
      if (target && target.isPlayer()) {
        if (this.getHandEquipment() && this.getHandEquipment().getConstants().canDamageEveryone) {
          return true
        }

        return false
      }
    }

    if (!target) return false
    if (target.isBuilding() && target.isOnFire()) return true
    if (target.isDestroyed()) return false

    if (target.isOwnedBy(this)) {
      if (target.isMob() && target.isLivestock) return true
      return false
    }

    if (this.isFriendlyUnit(target)) return false
    if (target.hasCategory("ghost")) return false

    let isTargetInsideCryotube = target.storage && target.storage.getType && target.storage.getType() === Protocol.definition().BuildingType.CryoTube
    if (isTargetInsideCryotube) return false

    if (target.hasCategory("platform") ||
        target.hasCategory("pipe") ||
        target.hasCategory("wire")) return false

    let isOwnedBySector = target.getOwner() === this.sector
    if (isOwnedBySector) return false

    return true
  }

  hasRecentlyRestarted() {
    return this.game.characterRestarts[this.getUid()]
  }

  restartCharacter() {
    this.game.addCharacterRestart(this)

    if (this.initialEscapePod) {
      this.initialEscapePod.clearStorage()
      this.initialEscapePod.remove()
    }

    this.removeInventoryAndEquipments()
    this.removeAllBuildingsPlacedInfo()

    this.leaveTeam()

    this.createSelfTeam()
    this.createSurvivalTool()
    this.initStartingEquipment()
    this.sector.findSpawnPositionForColonyOwner(this)
  }

  removeTeamMemberships() {
    let team = this.getTeam()
    if (team) {
      // LOG.info(`Player ${this.name} removed. about to leave member of ${team.name} - online: ${team.getMemberCount()} offline: ${team.getOfflineMemberCount()}`)
      team.removeMember(this)
    }
  }

  isAnonymous() {
    return !this.isLoggedIn()
  }

  clearInventoryOnly() {
    this.inventory.getStorageItems().forEach((item) => {
      item.remove()
    })
  }

  clearInventory(options = {}) {
    if (this.holdItem) {
      this.holdItem.remove()
      this.holdItem = null
      let json = { index: Constants.holdItemIndex, clientMustDelete: true }
      this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: json })
    }
    this.removeInventoryAndEquipments(options)
  }

  removeInventoryAndEquipments(options = {}) {
    let remainingCount = options.count
    this.inventory.getStorageItems().forEach((item) => {
      if (options.itemName) {
        if (item.getTypeName() === options.itemName) {
          if (options.count) {
            if (remainingCount > 0) {
              let countReduction = item.count
              item.reduceCount(remainingCount)
              remainingCount -= countReduction
            }
          } else {
            item.remove()
          }
        }
      } else {
        item.remove()
      }
    })

    this.equipments.getStorageItems().forEach((item) => {
      if (options.itemName) {
        if (item.getTypeName() === options.itemName) {
          if (options.count) {
            if (remainingCount > 0) {
              let countReduction = item.count
              item.reduceCount(remainingCount)
              remainingCount -= countReduction
            }
          } else {
            item.remove()
          }
        }
      } else {
        item.remove()
      }
    })
  }

  registerEventListeners() {
    this.onEntityRemovedListener = this.onEntityRemoved.bind(this)
    EventBus.addEventListener(this.game.getId() + ":entity:removed", this.onEntityRemovedListener)
  }

  unregisterEventListeners() {
    EventBus.removeEventListener(this.game.getId() + ":entity:removed", this.onEntityRemovedListener)
  }

  removeCore() {
    for (let index in this.inventory.storage) {
      let item = this.inventory.storage[index]
      if (item.getTypeName() === "Core") {
        item.remove()
        break
      }
    }

    if (this.core) {
      this.core.remove()
      this.core = null
    }
  }

  removeSurvivalTool() {
    for (let index in this.inventory.storage) {
      let item = this.inventory.storage[index]
      if (item.getTypeName() === "SurvivalTool") {
        item.remove()
        break
      }
    }
  }

  removeSpaceSuit() {
    for (let index in this.inventory.storage) {
      let item = this.inventory.storage[index]
      if (item.getTypeName() === "SpaceSuit") {
        item.remove()
        break
      }
    }
  }

  getPlayerMatchmakerData() {
    let playerTag = this.isLoggedIn() ? this.getUid() : this.getRemoteAddress()

    return {
      region: this.game.server.getRegion(),
      host: this.game.server.getHost(),
      sectorId: this.game.getSectorUid(),
      playerTag: playerTag,
      stress: this.isTroubleshooter
    }
  }

  shouldCreatePlayerData() {
    if (!this.isLoggedIn()) return false
    if (this.isSectorOwner()) return true
    if (this.isGuest()) return false

    return this.sector.getSetting("isPlayerSavingEnabled")
  }

  removeWithDelay() {
    delete this.game.playerIdMap[this.getSocketId()]
    this.game.addLeavingPlayer(this)
  }

  remove() {
    // dont remove twice, otherwise, savedata would be overwritten
    if (this.isRemoved) return

    super.remove()

    if (this.isTroubleshooter) {
      this.sector.removeTroubleshooter(this)
    }

    this.unassignObjectives()

    if (this.mounted) {
      this.mounted.unmount()
    }

    if (this.isControllingGhost()) {
      this.cameraFocusTarget.remove()
      this.cameraFocusTarget = null
    }

    this.unregisterEventListeners()
    this.removeChunkSubscriptions()
    this.removeViewSubscriptions()
    this.unregisterFromChunkRegion()
    this.unregisterFromPlayerViewership()
    this.removeCorpseViewerships()

    if (this.shouldCreatePlayerData()) {
      let playerData = this.createPlayerData()
      let inventoryCount = Object.keys(playerData.data.inventory.storage).length
      // LOG.info("Removing player: " + this.name + " saving inventory count: " + inventoryCount)
      this.saveOwnerships(playerData)
    } else {
      if (this.game.isPvP()) {
        if (this.initialEscapePod) {
          this.initialEscapePod.clearStorage()
          this.initialEscapePod.remove()
        }

        this.removeCore()
      }
      this.removeSurvivalTool()
      this.removeSpaceSuit()

      // LOG.info("Removing player: " + this.name + " throwing all inventory. isLoggedIn: " + this.isLoggedIn() + " isAdmin: " + this.isAdmin() + " isKicked: " + !!this.isKicked)

      if (this.getTeam()) {
        if (this.getTeam().isLeader(this)) {
          this.removeOwnerships()
        } else {
          this.transferOwnershipsTo(this.getTeam())
        }
      }
    }

    this.onDraggerRemoved()

    if (this.dragTarget) {
      this.releaseDragTarget()
    }

    this.setSector(null)
    if (this.getTeam() && !this.sector.isFovMode()) {
      this.getTeam().addChangedMapPosition(this, { isRemoved: true })
    }

    this.removeInventoryAndEquipments()
    this.removeAllBuildingsPlacedInfo()
    this.removeTeamMemberships()

    this.broadcastPlayerRemoved()
    this.game.onAlivePlayerCountChanged()

    this.game.removePlayer(this) // game also keeps track of players

    this.game.sendToMatchmaker({ event: "PlayerLeave",
      data: {
        playerRemoteAddress: this.getRemoteAddress(),
        fingerprint: this.fingerprint,
        host: this.game.server.getHost(),
        region: this.game.getRegion(),
        sectorUid: this.game.sectorUid
      }
    })

    this.clientMustDelete = true
    this.onStateChanged()
  }

  broadcastPlayerRemoved() {
    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), 'RemovedFromGame', { playerId: this.getId(), playerName: this.name })
    })
  }

  saveOwnerships(playerData) {
    this.transferOwnershipsTo(playerData)
  }

  onEquipmentUsageChanged(equipment) {
    this.game.triggerEvent("EquipmentUsageChanged", { itemType: equipment.item.type, usage: equipment.usage, actorId: this.getId() })

    if (this.isPlayerReady && equipment.item.storage && !this.isRemoved) {
      this.getSocketUtil().emit(this.socket, "InventoryChanged", { inventory: equipment.item })
    }
  }

  removeViewSubscriptions() {
    for (let id in this.viewSubscriptions) {
      this.viewSubscriptions[id].removeViewSubscriber(this)
    }

    this.viewSubscriptions = {}
  }

  removeChunkSubscriptions() {
    for (let chunkId in this.chunkSubscriptions) {
      let chunkSubscription = this.chunkSubscriptions[chunkId]
      chunkSubscription.removeSubscriber(this)
      delete this.chunkSubscriptions[chunkId]
    }
  }

  getCameraFocusTarget() {
    return this.cameraFocusTarget
  }

  createPlayerData() {
    let data = this.game.getWorldSerializer().createPlayerData(this)
    let playerData = new PlayerData(this.sector, data)

    this.game.addPlayerData(playerData)

    return playerData
  }

  cantMove() {
    return false
  }

  updateScreen(data) {
    if (this.sector.isZoomAllowed()) {
      this.screenWidth = data.screenWidth
      this.screenHeight = data.screenHeight
    }
    this.requestNewChunks()
  }

  getVisibleMobsInSafeZone() {
    const tree = this.sector.getTreeFromEntityType("mobs")
    return tree.search(this.getSafeSpawnBoundingBox())
  }

  setScore(amount) {
    this.score = amount
    this.onScoreChanged()
  }

  increaseScore(amount) {
    let prevScore = this.score
    this.score += amount
    this.onScoreChanged(prevScore, this.score)
  }

  reduceScore(amount) {
    let prevScore = this.score
    this.score -= amount
    if (this.score < 0) this.score = 0

    this.onScoreChanged(prevScore, this.score)
  }

  onScoreChanged(prevScore, currScore) {
    this.sector.onScoreChanged(this)

    this.game.triggerEvent("ScoreChanged", {
      playerId: this.id,
      player: this.getName(),
      previous: prevScore,
      current: currScore,
      delta: (currScore - prevScore)
    })
  }

  trade(data) {
    data.customer = this

    let tradeOrder = TradeOrder.create(data)
    if (tradeOrder) {
      tradeOrder.execute()
    }
  }

  getSellStorage() {
    return this.inventory.storage
  }

  canAfford(cost) {
    return this.gold >= cost
  }

  increaseGold(cost) {
    this.setGold(this.gold + cost)
  }

  reduceGold(cost) {
    this.setGold(this.gold - cost)
  }

  onWorldPostStep() {
    this.update(this.world.lastTimeStep)
  }

  postEdgify(body) {
    if (this.ship) {
      this.setPositionFromParent()
    } else {
      super.postEdgify(body)
    }
  }

  getPositionToEdgify(body) {
    if (this.ship) {
      return this.relativePosition
    } else {
      return super.getPositionToEdgify(body)
    }
  }

  setCameraFocusTarget(target) {
    this.cameraFocusTarget = target

    if (target.isPositionBased && target.hasOwnProperty("row")) {
      target.x = target.col * Constants.tileSize
      target.y = target.row * Constants.tileSize
    }

    this.onCameraFocusTargetChanged()
  }

  onCameraFocusTargetChanged() {
    this.requestNewChunks()

    if (this.cameraFocusTarget.isPositionBased) {
      this.getSocketUtil().emit(this.socket, "CameraFocusTarget", { row: this.cameraFocusTarget.row, col: this.cameraFocusTarget.col })
    } else {
      this.getSocketUtil().emit(this.socket, "CameraFocusTarget", { id: this.cameraFocusTarget.id })
    }
  }

  getBodyDouble() {

  }

  shouldSendToClient() {
    if (this.screenWidth > 4000) {
      return this.game.timestamp % 4 === 0// every  6 ticks
    } else if (this.screenWidth > 3000) {
      return this.game.timestamp % 3 === 0 // every 4 ticks
    } else if (this.screenWidth > 2000) {
      return this.game.timestamp % 2 === 0 // every 2 ticks
    } else {
      return true
    }
  }

  getScreenWidth() {
    return this.screenWidth
  }

  getScreenHeight() {
    return this.screenHeight
  }

  getMobSpawnBoundingBox() {
    var padding = Constants.tileSize * Constants.mobSpawnRadiusTileCount
    var cameraTarget = this
    var minX = cameraTarget.getX() - padding
    var maxX = cameraTarget.getX() + padding
    var minY = cameraTarget.getY() - padding
    var maxY = cameraTarget.getY() + padding

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  getMobDespawnBoundingBox() {
    var padding = Constants.tileSize * Constants.mobDespawnRadiusTileCount
    var cameraTarget = this
    var minX = cameraTarget.getX() - padding
    var maxX = cameraTarget.getX() + padding
    var minY = cameraTarget.getY() - padding
    var maxY = cameraTarget.getY() + padding

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  getSafeSpawnBoundingBox() {
    let safeSpawnRadiusTileCount = this.game.isNight ? Constants.mobSafeSpawnRadiusTileCountNight : Constants.mobSafeSpawnRadiusTileCountDay

    var padding = Constants.tileSize * safeSpawnRadiusTileCount
    var cameraTarget = this
    var minX = cameraTarget.getX() - padding
    var maxX = cameraTarget.getX() + padding
    var minY = cameraTarget.getY() - padding
    var maxY = cameraTarget.getY() + padding

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  getX() {
    if (this.container.isSector()) {
      return super.getX()
    } else if (this.container.isShip()) {
      return this.getAbsoluteXOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().x + this.getRelativeX()
    }
  }

  getY() {
    if (this.container.isSector()) {
      return super.getY()
    } else if (this.container.isShip()) {
      return this.getAbsoluteYOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().y + this.getRelativeY()
    }
  }

  repositionTo(x, y) {
    const targetEntityToMove = this.ship ? this.ship : this
    targetEntityToMove.setPosition(x,y)
  }

  getFeedBoundingBox() {
    const padding = Constants.tileSize / 2
    const dx = Constants.tileSize * Math.cos(this.getRadAngle())
    const dy = Constants.tileSize * Math.sin(this.getRadAngle())
    const x = this.getX() + dx
    const y = this.getY() + dy

    var minX = x - padding
    var maxX = x + padding
    var minY = y - padding
    var maxY = y + padding

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  getSpawnAreaBoundingBox() {
    var padding = 600;

    var minX = this.getX() - padding;
    var maxX = this.getX() + padding;
    var minY = this.getY() - padding;
    var maxY = this.getY() + padding;

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  }

  isDestroyable() {
    return true
  }

  act(data) {
    if (!this.canAct()) return
    if (this.isDestroyed()) return

    this.lastActionTime = this.game.clock

    const item = this.getActiveItem()
    const targetEntity = this.game.getEntity(data.targetEntityId)
    this.actTargetEntity = targetEntity

    if (item) {
      if (this.hasPendingItem()) return

      let restrictFlag = this.getRegionRestrictFlag(this.getX(), this.getY(), Constants.tileSize, Constants.tileSize)
      if (restrictFlag) {
        let restrictedItems = restrictFlag.split(",").map((name) => {
          return this.sector.klassifySnakeCase(name)
        })

        let isRestricted = restrictedItems.indexOf(item.getTypeName()) !== -1
        if (isRestricted) {
          this.showError("Not allowed to use it here")
          return
        }
      }

      if (this.isGuest() && item.isFlamethrower()) {
        this.showError("You are not allowed to use flamethrower")
        return
      }

      if (item.isFood() || item.isDrink()) {
        if (!this.releasedAction) {
          return
        }
      }

      if (item.isFood() && this.hasActiveFood()) {
        this.showError("You just ate")
        return
      }

      if (item.isDrug() && this.hasActiveDrug()) {
        this.showError("You just used. Wait for a few more seconds.")
        return
      }

      if (item.isDelayedConsumption()) {
        this.setPendingItem(item)
      } else {
        item.use(this, targetEntity, data)
      }
    } else {
      this.punch(targetEntity)
    }

  }

  removePendingItem() {
    this.pendingItem = null
    this.getSocketUtil().emit(this.getSocket(), "ProgressCircle", { clientMustDelete: true })
  }

  setPendingItem(item) {
    let duration = Constants.physicsTimeStep * 2
    this.pendingItem = item
    this.pendingItemReadyTimestamp = this.game.timestamp + duration
    this.sendEquipmentAnimation()

    this.getSocketUtil().emit(this.getSocket(), "ProgressCircle", { completeTimestamp: this.pendingItemReadyTimestamp })
  }

  isInjectable() {
    return true
  }

  getDamage() {
    let damage = super.getDamage()
    return Math.floor(this.getDamageMultiplier() * damage)
  }


  punch(targetEntity) {
    let target = this.getMeleeTarget(this.getRange(), { allowFriendlyFire: true })
    if (target) {
      if (target.isOnFire()) {
        target.reduceFireSlowly()
      } else if (this.canDamage(targetEntity)) {
        target.damage(this.getDamage(), this)
      }
    }

    let chunk = this.getChunk()
    if (chunk) {
      chunk.sendEquipmentAnimation(this)
    }

    this.consumeStamina("attack")
  }

  onEmptyHandUsed() {

  }

  stopAct(data) {

  }

  onEdgeHit(obstacle) {
    this.canJump = true

    const isObstacleSolid = obstacle
    if (isObstacleSolid && this.isEntity(obstacle) && obstacle.hasCategory("door")) {
      // obstacle.openFor(3000)
    }
  }

  isDraggable() {
    return true
  }


  isEntity(entity) {
    return (entity instanceof BaseEntity)
  }

  increaseDisconnection() {
    this.disconnection = this.disconnection || 0
    this.disconnection += 1
  }

  resetDisconnection() {
    this.disconnection = 0
  }

  getKnockVerticalSpeed() {
    return 10
  }

  getWeaponRotation() {
    return 0
  }

  knock() {
    this.body.velocity[1] = this.getKnockVerticalSpeed()
  }

  getAttackables() {
    return this.sector.getPlayerAttackables()
  }

  onAttackTargetFound() {
    // dont do anything
  }

  onTargetOutOfRange() {
    // dont do anything
  }

  getSocket() {
    return this.socket
  }

  gather(data) {
    const entity = this.game.getEntity(data.id)

    if (this.sector.isLobby()) {
      entity.harvest()
    }
  }

  checkJsonChanged(group, entityJson, prevEntityJson) {
    let result

    switch(group) {
      case "ships":
      case "collider":
        result = true
        break
      case "players":
        result = !_.isEqual(entityJson, prevEntityJson)
        break
      case "rooms":
        result = entityJson.id !== prevEntityJson.id ||
                 entityJson.tiles.length !== prevEntityJson.tiles.length
        break
      case "chunks":
        result = entityJson.id !== prevEntityJson.id
        break
      case "regions":
      case "mobs":
      case "terrains":
      case "buildings":
      case "projectiles":
      case "equipments":
      case "units":
        result = !_.isEqual(entityJson, prevEntityJson)
        break
      case "inventory":
        result = !_.isEqual(entityJson, prevEntityJson)
        break
      case "pickups":
      case "paths":
        result = entityJson.isChanged
        break
      default:
        throw new Error("must implement checkJsonChanged for " + group)
        result = true
    }

    return result
  }

  objectifyArray(array) {
    let result = {}

    for (var i = 0; i < array.length; ++i) {
      let object = array[i]
      result[object.id] = object
    }

    return result
  }

  setEquipIndex(index) {
    if (!this.isControllingPlayer()) return

    index = parseInt(index)
    if (index < -1 || index >= Constants.regularInventoryBaseIndex) return

    const prevIndex = this.equipIndex

    if (prevIndex !== index) {
      this.equipIndex = index
      this.onEquipIndexChanged(prevIndex, index)
    }
  }

  onEquipIndexChanged(prevIndex, newIndex) {
    if (this.isPlayerReady) {
      this.getSocketUtil().emit(this.getSocket(), "EquipIndexChanged", { equipIndex: newIndex })
    }

    const oldItem = this.inventory.get(prevIndex)
    const item = this.inventory.get(newIndex)
    if (oldItem && oldItem.isFireArmOrThrowableOrMelee()) {
      this.itemSwitchAllowActionTime = this.lastActionTime + oldItem.getCooldownInMilliseconds()
    }
    this.setHandEquipment(item)
  }

  setInitialEscapePod(escapePod) {
    this.initialEscapePod = escapePod
  }

  removeHandEquipment() {
    // reset hand equip
    this.equipments.removeAt(Protocol.definition().EquipmentRole.Hand)
  }

  getHandEquipment() {
    let item = this.equipments.get(Protocol.definition().EquipmentRole.Hand)
    return item && item.instance
  }

  getArmorEquipment() {
    let item = this.equipments.get(Protocol.definition().EquipmentRole.Armor)
    return item && item.instance
  }

  getSessionDuration() {
    return Math.floor((Date.now() - this.resumeTime) / 1000)
  }

  isDirectionKeysHeld() {
    return this.controlKeys & Constants.Control.left  ||
           this.controlKeys & Constants.Control.up    ||
           this.controlKeys & Constants.Control.down  ||
           this.controlKeys & Constants.Control.right
  }

  static isEqual(json, otherJson) {
    return _.isEqual(json, otherJson)
  }

  getMaxSpeed() {
    return this.getSpeed()
  }

  getDamageMultiplier() {
    let multiplier = 1

    if (this.hasEffect("fear")) {
      multiplier -= 0.3
    }

    if (this.hasEffect("drunk")) {
      multiplier -= 0.5
    }

    return multiplier
  }

  chat(data) {
    let message  = data.message
    const isCommand = message[0] === "/"
    let isTeamChat = data.isTeam

    if (this.sector.voteManager.isStarted) {
      if (this.isDestroyed()) {
        this.showChatError("dead people cant vote")
        return
      }
    }

    if (isCommand) {
      this.executeCommand(message)
      this.game.triggerEvent("PlayerMessage", {
        message: message,
        player: this.getName()
      })
    } else {
      if (!message) return
      if (this.isMuted) {
        this.showChatError("You are muted")
        return
      }
      //xss won't work in the client, no need for double xss prevention
      //message = this.sanitize(message)

      let maxChatLength = 100
      message = message.substring(0, maxChatLength)

      if (message.length <= 0) return

      if (!this.sector.settings["isChatEnabled"]) {
        if (!this.sector.voteManager.isStarted) {
          return
        }
      }

      // if (!this.isLoggedIn()) {
      //   this.showChatError("must login to chat")
      //   return
      // }

      message = this.replaceBadWords(message)

      let isSameMessage = this.lastMessage === message
      let isSlowMode = !this.isLoggedIn() || isSameMessage
      if (isSlowMode && (Date.now() - this.lastChatTimestamp < 3000)) {
        this.getSocketUtil().emit(this.socket, "ServerChat", { message: "%error%Please wait 3 seconds", isTeam: isTeamChat })
        return
      }

      this.lastChatTimestamp = Date.now()
      // reset other players chat timer, to allow them to reply immediately
      this.game.forEachPlayer((player) => {
        if (player !== this) {
          player.lastChatTimestamp = 0
        }
      })

      this.lastMessage = message

      this.game.triggerEvent("PlayerMessage", {
        message: message,
        player: this.getName()
      })

      if (data.isGlobal) {
        LOG.info("globalchat> " + this.name + ": " + message)
        let data = { username: this.name, message: message }
        if (this.isLoggedIn()) {
          data.uid = this.getUid()
        }
        this.game.sendToMatchmaker({ event: "GlobalClientChat", data: data })
      } else {
        LOG.info("[" + this.game.getSectorUid() + "] chat> " + this.name + ": " + message)
        let data = { playerId: this.id, message: message, username: this.name, isTeam: isTeamChat }
        if (this.isLoggedIn()) {
          data.uid = this.getUid()
        }

        if (isTeamChat) {
          this.getSocketUtil().broadcast(this.getTeam().getSocketIds(), "ServerChat", data)
        } else {
          this.getSocketUtil().broadcast(this.sector.getSocketIds(), "ServerChat", data)
        }
      }
    }
  }

  replacePhysicalGoldWithVirtual() {
    if (this.isSectorOwner() && this.getTeam()) {
      this.makeGoldVirtual()
    }
  }

  removeStaleVisibles() {
    // player/corpses that were previously visible in non-fov mode should be removed
    let result = { "players": {}, "corpses": {} }
    this.game.forEachPlayer((player) => {
      let isNotVisible = !this.visiblePlayers[player.id]
      if (isNotVisible) {
        result["players"][player.id] = { id: player.id, clientMustDelete: true }
      }
    })

    this.game.sector.forEachCorpse((corpse) => {
      let isNotVisible = !this.visibleCorpses[corpse.id]
      if (isNotVisible) {
        result["corpses"][corpse.id] = { id: corpse.id, clientMustDelete: true }
      }
    })

    this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", result)
  }

  viewCamera(data) {
    let camera = this.sector.cameraFeeds[data.id]
    if (!camera) {
      this.resetCameraFocusTarget()
      this.skipFov = false
      if (this.sector.isFovMode()) {
        this.removeStaleVisibles()
      }
      return
    }

    let row = camera.getCenterRow()
    let col = camera.getCenterCol()

    this.skipFov = true
    this.setCameraFocusTarget({
      row: row,
      col: col,
      isPositionBased: true
    })
  }

  sendMoney(targetPlayer, gold) {
    if (gold < 0) {
      this.showError("Invalid Amount", { isWarning: true })
      return
    }

    if (this.gold < gold) {
      this.showError("Not enough gold", { isWarning: true })
      return
    }

    targetPlayer.increaseGold(gold)
    this.reduceGold(gold)
  }

  makeGoldVirtual() {
    let gold = 0

    let team = this.getTeam()

    for (let id in team.ownerships.structures) {
      let structure = team.ownerships.structures[id]
      if (structure.hasStorage()) {
        let items = structure.getStorageItems()
        items.forEach((item) => {
          try {
            if (item.isItem() && item.isGold()) {
              gold += item.getCount()
              item.remove()
            }
          } catch(e) {
            this.game.captureException(e)
          }
        })
      }
    }


    let items = this.inventory.getStorageItems()
    items.forEach((item) => {
      try {
        if (item.isItem() && item.isGold()) {
          gold += item.getCount()
          item.remove()
        }
      } catch(e) {
        this.game.captureException(e)
      }
    })

    this.increaseGold(gold)
  }

  canRespawn() {
    if (this.game.isMiniGame()) {
      return this.game.sector.miniGame.canRespawn(this)
    }

    return true
  }

  onEffectAdded(effect) {
    if (effect === "invisible") {
      if (this.getTeam()) {
        this.getTeam().addChangedMapPosition(this, { isRemoved: true })
      }
    }

    super.onEffectAdded(effect)
  }

  replaceBadWords(message) {
    if (Helper.isJapaneseText(message)) {
      message = BadWordsFilter.replaceBadWordsJapanese(message)
    }

    message = BadWordsFilter.replaceBadWordsEnglish(message)

    return message
  }

  throwAllInventory() {
    this.inventory.forEachItem((item) => {
      if (item) {
        this.inventory.removeItem(item)
        this.throwInventory(item)
      }
    })
  }

  throwAllInventoryExceptSurvivalTool() {
    this.inventory.forEachItem((item) => {
      if (item) {
        if (item.getTypeName() !== 'SurvivalTool') {
          this.inventory.removeItem(item)
          this.throwInventory(item)
        }
      }
    })
  }

  changeSuitColor(color) {
    let equipment = this.getArmorEquipment()
    if (equipment && equipment.getType() === Protocol.definition().BuildingType.SpaceSuit) {
      equipment.setContent(color)
    }
  }

  executeCommand(message) {
    // LOG.info("[" + this.game.getSectorUid() + "] " + this.name + ": " + message)
    this.game.executeCommand(this, message)
  }

  setHandEquipment(item) {
    // reset hand equip
    this.equipments.removeAt(Protocol.definition().EquipmentRole.Hand)

    if (item && item.isUsableEquipment()) {
      // we create a new item since its also gonna be stored in new storage "equipments"
      // and thus it needs a new index different from the index in "inventory"
      // but it still references the same equipment instance
      const equipmentItem = new Item(this, item.type, { count: 1, instance: item.instance })
      item.equipmentItem = equipmentItem // store a reference
      this.equipments.storeAt(Protocol.definition().EquipmentRole.Hand, equipmentItem)
    }

    this.onStateChanged()
  }

  resetControls() {
    this.controlKeys = 0
    this.inputAngle = undefined
    this.idle = true
  }

  setHidden(isHidden) {
    this.isHidden = isHidden
    this.onStateChanged("isHidden")
  }

  setLastLampContent(content) {
    this.lastLampContent = content
  }

  setLastCustomAccess(building) {
    if (building.isCustomAccess) {
      this.lastCustomAccess = { type: building.type, accessType: building.accessType }
    } else {
      this.lastCustomAccess = null
    }
  }

  setColorIndex(colorIndex) {
    this.colorIndex = colorIndex
    this.getSocketUtil().emit(this.getSocket(), "UpdateStats", { colorIndex: this.colorIndex })
  }

  setTextureIndex(textureIndex) {
    this.textureIndex = textureIndex
    this.getSocketUtil().emit(this.getSocket(), "UpdateStats", { textureIndex: this.textureIndex })
  }

  viewTeamLogs() {
    let activityLogs = this.sector.getActivityLogs(this.getTeam().id)
    let commandLogs = this.sector.getCommandLogs(this.getTeam().id)

    this.getSocketUtil().emit(this.getSocket(), "TeamLogs", { activityLogs: activityLogs, commandLogs: commandLogs })
  }

  onStateChanged(attribute) {
    if (!this.isReady()) return

    let isStatAttribute = this.PLAYER_STAT_ATTRIBUTES.indexOf(attribute) !== -1
    if (isStatAttribute) {
      const data = {}

      if (attribute === "oxygen") {
        data[attribute] = this.getOxygen()
      } else {
        data[attribute] = this[attribute]
      }

      this.getSocketUtil().emit(this.getSocket(), "UpdateStats", data)
    } else {
      let chunk = this.getChunk()
      if (chunk) {
        chunk.addChangedPlayers(this)
      }

      if (this.sector.isFovMode()) {
        for (let id in this.playerViewerships) {
          this.playerViewerships[id].addChangedPlayers(this)
        }
        this.addChangedPlayers(this)
      }
    }
  }

  getRaidableOwnedStructures() {
    return this.getOwnedStructures().filter((building) => {
      return !building.sector.isLobby() && !building.hasCategory("door")
    })
  }

  getRotatedAngle() {
    return this.angle
  }

  getTargetVelocityFromAngle(angle) {
    let radAngle = angle * (Math.PI / 180)
    let vx = Math.cos(radAngle) * this.getSpeed()
    let vy = Math.sin(radAngle) * this.getSpeed()

    return [vx, vy]
  }

  getMaxViewDistance() {
    return this.viewDistance || Constants.fovViewDistance
  }

  setViewDistance(distance) {
    this.viewDistance = distance

    if (this.sector.isFovMode()) {
      if (this.isControllingGhost()) return
      this.assignFov()
    }

    this.onStateChanged("viewDistance")
  }

  getRoleName() {
    if (!this.getRole()) return ""
    return this.getRole().name
  }

  sendChangedRooms() {
    if (Object.keys(this.changedRooms).length === 0) return

    this.getSocketUtil().emit(this.getSocket(), "EntityUpdated", { rooms: this.changedRooms })

    this.clearChangedRooms()
  }

  addChangedRooms(entity) {
    this.changedRooms[entity.getId()] = entity
    this.sector.addChangedRoomsForPlayer(this)
  }

  clearChangedRooms() {
    this.changedRooms = {}
  }

}

Object.assign(Player.prototype, Upgradable.prototype)
Object.assign(Player.prototype, PlayerCommon.prototype, {
  onGoldChanged(previous, current) {
    this.game.triggerEvent("GoldChanged", {
      playerId: this.id,
      player: this.getName(),
      previous: previous,
      current: current,
      delta: current - previous
    })

    this.sector.bufferClientGoldUpdate(this)
  },
  getVisibleChunks() {
    // if (this.sector.isFovMode()) {
    //   let boundingBox = this.getLimitedCameraBoundingBox()
    //   return Helper.getChunksFromBoundingBox(this.sector, boundingBox)
    // } else {
      let boundingBox = this.getCameraBoundingBox()
      return Helper.getChunksFromBoundingBox(this.sector, boundingBox)
    // }
  }
})

Object.assign(Player.prototype, Movable.prototype, {
  getAngleDeltaFromControls() {
    // never change angle based on wasd keys
    return 0
  },
  getSpeed() {
    let speed = this.speed ? this.speed : Constants.Player.speed

    // apply buffs

    if (this.mounted) {
      const platform = this.getStandingPlatform()
      if (!platform) {
        speed += 3
      }
    } else if (!this.getArmorEquipment()) {
      if (!this.game.isMiniGame()) {
        speed += 2
      }
    }

    speed = this.isLowStatus("stamina") ? speed / 2 : speed

    return speed * Constants.globalSpeedMultiplier
  },
  getTargetVelocityFromControls(controlKeys) {
    return this.getVelocityFromControls(controlKeys, this.getSpeed())
  }
})

Object.assign(Player.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.relativePosition[0]
  },
  getRelativeY() {
    return this.relativePosition[1]
  }
})

Object.assign(Player.prototype, Destroyable.prototype, {
  damage(amount, attacker, sourceEntity) {
    if (this.isInvulnerable) return
    if (this.isGod()) return

    if (this.getArmorEquipment()) {
      amount = this.getArmorEquipment().reduceDamage(amount, sourceEntity)
    }

    if (isNaN(amount)) {
      throw new Error("damage amount " + amount + " is invalid")
    }

    const prevHealth = this.health

    let delta = this.health - amount
    this.onDamaged(attacker, prevHealth)
    this.setHealth(this.health - amount)


    let data = {
      player: this.getName(),
      playerRole: this.getRoleName(),
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

    this.game.triggerEvent("PlayerAttacked", data)
  },
  onDamaged(attacker, prevHealth) {
    this.attackerId = attacker && attacker.id

    // this.spillBlood()
  },
  onHealthZero() {
    if (this.isGod()) return

    if (this.skipFov) {
      this.viewCamera(0) // stop viewing camera
    }

    if (this.sector.settings['isDropInventoryOnDeath']) {
      this.throwAllInventory()
    }

    this.resetControls()
    this.setRespawnTime()

    this.score = 0

    if (this.mounted) {
      this.mounted.unmount()
    }

    if (this.dragTarget) {
      this.releaseDragTarget()
    }

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "PlayerDestroyed", { id: this.id, canRespawn: this.canRespawn(), restartCooldown: this.getRespawnCooldown()  })
    EventBus.dispatch(`${this.game.getId()}:entity:died:${this.getId()}`, this)

    let data = {
      playerName: this.getName(),
      playerRole: this.getRoleName(),
      player: this.getName(),
      killingPlayer: "",
      killingPlayerRole: "",
      killingMob: ""
    }

    if (this.sector.isMiniGame()) {
      data['playerId'] = this.id
      data['canRespawn'] = this.canRespawn()
    }

    let lastHitBy = this.game.getEntity(this.attackerId)
    if (lastHitBy) {
      let killer = this.getKillerFromAttacker(lastHitBy)
      if (killer) {
        data["attackerId"] = killer.id
        if (killer.isPlayer()) {
          data["killingPlayer"] = killer.name
          data["killingPlayerRole"] = killer.getRoleName()
        } else if (killer.isMob()) {
          data["killingMob"] = killer.id
        }
      }
    }

    this.game.triggerEvent("PlayerDestroyed", data)

    if (this.game.isMiniGame() && !this.canRespawn()) {
      this.setHidden(true)
      this.transformIntoGhost()
      this.followGhost()
      this.game.onAlivePlayerCountChanged()
    }
  },
  onPostSetHealth(delta) {
    if (delta < 0) {
      if (this.isGod() || this.isBot()) {
        delta = 0
        this.health = this.getMaxHealth()
      }
    }

    let data = {
      "entityId": this.id,
      "entityType": "",
      "playerId": this.id,
      "player": this.getName(),
      "previous": (this.health - delta),
      "current": this.health,
      "delta": delta
    }

    this.game.triggerEvent("HealthChanged", data)

    let team = this.getJoinableTeam()
    if (team) {
      team.broadcastPlayerHealth(this)
    }

    this.onStateChanged("health")
  },
  getMaxHealth() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].health
      }
    }

    return 100
  }
})

Object.assign(Player.prototype, Owner.prototype, {
})

Object.assign(Player.prototype, Needs.prototype, {
  onOxygenChanged(delta) {
    this.onStateChanged("oxygen")

    let data = {
      "playerId": this.id,
      "player": this.getName(),
      "previous": (this.oxygen - delta),
      "current": this.oxygen,
      "delta": delta
    }

    this.game.triggerEvent("OxygenChanged", data)
  },
  onStaminaChanged(delta) {
    this.onStateChanged("stamina")

    let data = {
      "playerId": this.id,
      "player": this.getName(),
      "previous": (this.stamina - delta),
      "current": this.stamina,
      "delta": delta
    }

    this.game.triggerEvent("StaminaChanged", data)
  },
  onHungerChanged(delta) {
    this.onStateChanged("hunger")

    let data = {
      "playerId": this.id,
      "player": this.getName(),
      "previous": (this.hunger - delta),
      "current": this.hunger,
      "delta": delta
    }

    this.game.triggerEvent("HungerChanged", data)
  },
  getMaxStamina() {
    if (this.game.isPvP()) return 300
    return Constants.Player.stamina
  },
  getMaxOxygen() {
    const armor = this.getArmorEquip()
    if (armor && armor.hasOxygen()) {
      return armor.getMaxOxygen()
    } else {
      return Constants.Player.oxygen
    }
  },
  onHungerZero() {
    this.damage(2)
  }
})

Object.assign(Player.prototype, NeedsServer.prototype, {
})

Object.assign(Player.prototype, Dragger.prototype, {
  onDragTargetChanged() {
    this.progressTutorial("corpse", 1)
  }
})

module.exports = Player
