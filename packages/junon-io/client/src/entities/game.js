const Player = require("./player")
const InputController = require("./input_controller")
const SocketUtil = require("./../util/socket_util")
const Helper = require("./../../../common/helper")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const Grid = require("./../../../common/entities/grid")
const Terrains = require("./terrains/index")
const Buildings = require("./buildings/index")
const Projectiles = require("./projectiles/index")
const Particles = require("./particles/index")
const Transports = require("./transports/index")
const Menus = require("./../menus/index")
const Mobs = require("./mobs/index")
const Backgrounds = require("./backgrounds/index")
const Ship = require("./ship")
const Sector = require("./sector")
const Room = require("./room")
const Pickup = require("./pickup")
const ChunkRegion = require("./chunk_region")
const ChunkRegionPath = require("./chunk_region_path")
const Corpse = require("./corpse")
const Path = require("./path")
const Item = require("./item")
const Region = require("./region")
const Button = require("./button")
const RegionManager = require("./region_manager")
const Team = require("./team")
const Draggable = require("@shopify/draggable").Draggable
const Equipments = require("./equipments/index")
const ClientHelper = require("./../util/client_helper")
const ExceptionReporter = require("./../util/exception_reporter")
const Bowser = require("bowser")
const Cookies = require("js-cookie")
const FirebaseClientHelper = require('../util/firebase_client_helper')
const uuidv4 = require('uuid/v4')

class Game {
  constructor(main) {
    this.neverInitialized = true // important - only initialize once to avoid ticker being added multiple times

    this.main = main
    this.initVariables()
    this.initPersistentVariables()
    this.initConstants()
    this.initKeyBindings()
    this.initAdditionalLibraries()
    this.initWorld()
  }

  getId() {
    return this.creatorUid // some random number
  }

  setGameConnection(gameConnection) {
    this.gameConnection = gameConnection
    this.reinitConnection()

    this.gameConnection.setGame(this)
  }

  initPersistentVariables() {
    this.armorTextures = {}
    this.loadedSounds = {}
  }

  addMutedPlayer(name) {
    this.mutedPlayers[name] = true
  }

  removeMutedPlayer(name) {
    delete this.mutedPlayers[name] 
  }

  initVariables(options = {}) {
    this.destinationStorageId = null
    this.inventoryCooldowns = {}
    this.eventCountdownIntervals = {}
    this.mutedPlayers = {}
    this.commandBlockTimers = {}
    this.isAFK = false
    this.totalTaskBar        = document.querySelector('.total_task_stat')
    this.healthBar        = document.querySelector('.health_stat')
    this.shieldBar        = document.querySelector('.shield_stat')
    this.oxygenBar        = document.querySelector('.oxygen_stat')
    this.hungerBar        = document.querySelector('.hunger_stat')
    this.staminaBar       = document.querySelector('.stamina_stat')
    this.roomOxygenBar    = document.querySelector('.room_oxygen_stat')
    this.energyBar        = document.querySelector('.energy_stat')
    this.errorContent     = document.querySelector('#error_menu_content')
    this.errorTitle       = document.querySelector('#error_title')
    this.shipStatSpeed    = document.querySelector('.ship_stat_speed')
    this.shipStatHealth   = document.querySelector('.ship_stat_health')
    this.shipStatShield   = document.querySelector('.ship_stat_shield')
    this.shipStatEnergy   = document.querySelector('.ship_stat_energy')
    this.shipStatMiningRate = document.querySelector('.ship_stat_mining_rate')
    this.playerPos        = document.querySelector(".player_pos")
    this.waveIncomingTime = document.querySelector("#wave_remaining_time_value")
    this.deathScreen      = document.querySelector("#death_screen_container")
    this.zoomInBtn        = document.querySelector("#zoom_in_btn")
    this.zoomOutBtn       = document.querySelector("#zoom_out_btn")
    this.chatInput        = document.querySelector("#chat_input")
    this.chatInputContainer = document.querySelector("#chat_input_container")
    this.restartBtn       = document.querySelector("#restart_btn")
    this.mobilePrimaryActionBtn = document.querySelector("#mobile_primary_action_btn")
    this.isTracingChunkRegionPath = false
    this.isChunkDisplayEnabled = false

    window.debug_buffer = []
    this.server_update_rate = Constants.physicsTimeStep
    this.upstreamIntervals = []
    this.maxUpstreamIntervals = []
    this.resolution = 1
    this.latencyCalculateIntervalInSeconds = 10
    this.ticksSincePacket = 0
    this.isServerShutdownInProgress = false
    this.firstServerMessage = true
    this.shownChunkRegionPaths = []
    if (!options.excludeTeamInit) {
      this.teams = {}
    }

    window.zoomEnabled = true
    this.isAdminMode = debugMode
    this.isInitialAdminSetup = true
    this.playerId = null
    this.player = null

    this.residents = {}

    this.lastFrameTime = (new Date()).getTime()
    this.myScore = 0
  }

  initFloorTextures() {
    this.floorTextures = {}

    for (let label in Constants.FloorTextures) {
      let texture = Constants.FloorTextures[label]
      this.floorTextures[texture.index] = label + ".png"
    }
  }

  generateId() {
    return uuidv4()
  }

  initFloorColors() {
    this.colors = {}

    for (let label in Constants.FloorColors) {
      let color = Constants.FloorColors[label]
      let colorValue = ClientHelper.hexToInt(color.value)
      this.colors[color.index] = { label: label, value: colorValue }
    }
  }

  initSuitColors() {
    this.suitColors = {}

    for (let label in Constants.SuitColors) {
      let color = Constants.SuitColors[label]
      let colorValue = ClientHelper.hexToInt(color.value)
      this.suitColors[color.index] = { label: label, value: colorValue }
    }
  }

  reinitConnection() {
    SocketUtil.setSocket(this.gameConnection.socket)
  }

  getSocketUtil() {
    return SocketUtil
  }

  initUI() {
    this.initMenus()
    this.initListeners()
    this.initDraggables()
  }

  showNameInput() {
    document.querySelector("#name_input_container").style.display = 'block'
  }

  denyMenuOpen() {
    this.shouldDenyMenuOpen = true
  }

  allowMenuOpen() {
    this.shouldDenyMenuOpen = false
  }

  createSmoke(options) {
    return Particles.Smoke.create(options)
  }

  initMenus() {
    this.openMenus = []

    this.entityMenu    = new Menus.EntityMenu(this, document.querySelector("#entity_menu"))
    this.blueprintMenu = new Menus.BlueprintMenu(this, document.querySelector("#blueprint_menu"))
    this.craftMenu     = new Menus.CraftMenu(this, document.querySelector("#craft_menu"))
    this.processorMenu = new Menus.ProcessorMenu(this, document.querySelector("#processor_menu"))
    this.storageMenu   = new Menus.StorageMenu(this, document.querySelector("#storage_menu"))
    this.inventoryMenu = new Menus.InventoryMenu(this, document.querySelector("#inventory_menu"))
    this.oxygenTankMenu = new Menus.OxygenTankMenu(this, document.querySelector("#oxygen_tank_menu"))
    this.debugMenu      = new Menus.DebugMenu(this, document.querySelector("#debug_menu"))
    this.chatMenu       = new Menus.ChatMenu(this, document.querySelector("#chat_container"))
    this.tradeMenu      = new Menus.TradeMenu(this, document.querySelector("#trade_menu"))
    this.playerMenu     = new Menus.PlayerMenu(this, document.querySelector("#player_menu"))
    this.lightPathMenu  = new Menus.LightPathMenu(this, document.querySelector("#light_path_menu"))
    this.welcomeMenu    = new Menus.WelcomeMenu(this, document.querySelector("#welcome_menu"))
    this.tutorialMenu   = new Menus.TutorialMenu(this, document.querySelector("#tutorial_menu"))
    this.mapMenu        = new Menus.MapMenu(this, document.querySelector("#map_menu"))
    this.miniMapMenu    = new Menus.MiniMapMenu(this, document.querySelector("#mini_map_menu"))
    this.statusListMenu = new Menus.StatusListMenu(this, document.querySelector("#status_list_menu"))
    this.teamMenu       = new Menus.TeamMenu(this, document.querySelector("#manage_team_menu"))
    this.teamRequestMenu  = new Menus.TeamRequestMenu(this, document.querySelector("#team_request_menu"))
    this.teamStatusMenu  = new Menus.TeamStatusMenu(this, document.querySelector("#team_status_menu"))
    this.friendsMenu  = new Menus.FriendsMenu(this, document.querySelector("#friends_menu"))
    this.npcDialogMenu  = new Menus.NPCDialogMenu(this, document.querySelector("#npc_dialog_menu"))
    this.railStopMenu  = new Menus.RailStopMenu(this, document.querySelector("#rail_stop_menu"))
    this.signMenu  = new Menus.SignMenu(this, document.querySelector("#sign_menu"))
    this.userProfileMenu = new Menus.UserProfileMenu(this, document.querySelector("#user_profile_menu"))
    this.confirmMenu = new Menus.ConfirmMenu(this, document.querySelector("#confirm_menu"))
    this.permissionsMenu = new Menus.PermissionsMenu(this, document.querySelector("#permissions_menu"))
    this.sendMoneyMenu = new Menus.SendMoneyMenu(this, document.querySelector("#send_money_menu"))
    this.vendingMachineMenu = new Menus.VendingMachineMenu(this, document.querySelector("#vending_machine_menu"))
    this.atmMenu = new Menus.AtmMenu(this, document.querySelector("#atm_menu"))
    this.soilMenu = new Menus.SoilMenu(this, document.querySelector("#soil_menu"))
    this.slaveTradeMenu      = new Menus.SlaveTradeMenu(this, document.querySelector("#slave_trade_menu"))
    this.stoveMenu = new Menus.StoveMenu(this, document.querySelector("#stove_menu"))
    this.walkthroughMenu = new Menus.WalkthroughMenu(this, document.querySelector("#walkthrough_menu"))
    this.leaderboardMenu = new Menus.LeaderboardMenu(this, document.querySelector("#leaderboard_menu"))
    this.teamFullMenu = new Menus.TeamFullMenu(this, document.querySelector("#team_full_menu"))
    this.previewCaptureMenu = new Menus.PreviewCaptureMenu(this, document.querySelector("#preview_capture_menu"))
    this.changeNameMenu = new Menus.ChangeNameMenu(this, document.querySelector("#change_name_menu"))
    this.selectDifficultyMenu = new Menus.SelectDifficultyMenu(this, document.querySelector("#select_difficulty_menu"))
    this.colorPickerMenu = new Menus.ColorPickerMenu(this, document.querySelector("#color_picker_menu"))
    this.voteMenu = new Menus.VoteMenu(this, document.querySelector("#vote_menu"))
    this.questMenu = new Menus.QuestMenu(this, document.querySelector("#quest_menu"))
    this.endGameMenu = new Menus.EndGameMenu(this, document.querySelector("#end_game_menu"))
    this.sidebarMenu = new Menus.SidebarMenu(this, document.querySelector("#sidebar_menu"))
    this.securityCameraMenu = new Menus.SecurityCameraMenu(this, document.querySelector("#security_camera_menu"))
    this.suitColorMenu = new Menus.SuitColorMenu(this, document.querySelector("#suit_color_menu"))
    this.terminalMenu = new Menus.TerminalMenu(this, document.querySelector("#terminal_menu"))
    this.commandBlockMenu = new Menus.CommandBlockMenu(this, document.querySelector("#command_block_menu"))
    this.commandBlockPicker = new Menus.CommandBlockPicker(this, document.querySelector("#command_block_picker"))
    this.friendRequestMenu  = new Menus.FriendRequestMenu(this, document.querySelector("#friend_request_menu"))

    this.visitColonyMenu = this.main.gameExplorer

    if (this.isMobile()) {
      this.createMobileBuildActionMenu()
      document.querySelector("#base_hud .resources").style.display = 'none'
    }
  }

  onFriendRequestReceived(request) {
    this.friendRequestMenu.createRequestEntry(request)
  }

  registerMenu(menu) {
    this.menus = this.menus || []
    this.menus.push(menu)
  }

  getRoleByName(name) {
    let result
    
    for (let id in this.roles) {
      let role = this.roles[id]
      if (role.name === name) {
        result = role
        break
      }
    }

    return result
  }

  onRoleUpdated(data) {
    if (!this.sector) return

    if (this.player.teamId !== data.teamId) return

    if (this.roles[data.role.id]) {
      if (data.clientShouldDelete) {
        delete this.roles[data.role.id]
        this.teamMenu.removeRole(data.role.id)
      } else {
        this.roles[data.role.id] = data.role
        this.teamMenu.updateRole(data.role)
      }
    } else {
      this.roles[data.role.id] = data.role
      let roleEl = this.teamMenu.addRole(data.role)
      this.teamMenu.selectRole(roleEl)
    }

    this.entityMenu.createPermissions() // add new role to permission checkbox
    this.entityMenu.populateSpawnPointSelectors()
  }

  onTeamUpdated(data) {
    if (!this.sector) return

    let team = this.teams[data.team.id]
    if (!team) {
      if (!data.team.clientMustDelete) {
        team = new Team(this, data.team)
        this.teams[data.team.id] = team
        this.teamMenu.addTeam(team)
      }
    } else if (data.team.clientMustDelete) {
      delete this.teams[data.team.id]
      this.teamMenu.removeTeam(team)
      team.remove()
    } else {
      team.syncWithServer(data.team)
      this.teamMenu.syncTeam(team)
    }

    this.entityMenu.populateSpawnPointSelectors()
  }

  setTeams(teams) {
    for (let id in teams) {
      let data = teams[id]
      this.onTeamUpdated({ team: data })
    }
  }

  getItemKlass(type) {
    return Item.getKlass(type)
  }

  getItemKlassByName(name) {
    return Item.getKlassByName(name)
  }

  getUrl() {
    return this.gameConnection.url
  }

  onTeamRequest(data) {
    if (data.clientMustDelete) {
      this.teamRequestMenu.removeTeamRequestEntry(data)
    } else {
      this.teamRequestMenu.createTeamRequestEntry(data)
    }
  }

  onTeamInvitation(data) {
    if (data.isReject) {
      setTimeout(() => {
        this.teamMenu.resetTeamRequestStatus(data.teamId)
      }, 1000 * 60 * 3)
    }
  }

  openOxygenTank(entity) {
    this.oxygenTankMenu.open(entity)
  }

  initDraggables() {
    const containers = Array.from(document.querySelectorAll(".storage, #game_canvas"))

    const dragDelay = 150

    const draggable = new Draggable(containers, {
      draggable: '.inventory_slot',
      delay: dragDelay,
      placedTimeout: 100
    })

    const canvasContainer = new Draggable(document.querySelector("#game_canvas"), {
      draggable: '.player_inventory_slot',
    })

    draggable.on('drag:start', (event) => {
      this.isDragging = true
    })

    draggable.on('drag:over:container', (event) => {
      let hoveredContainer = event.data.overContainer
      if (hoveredContainer.id === "game_canvas") {
        this.destinationStorageId = Constants.worldStorageId
      }
    })

    draggable.on('drag:over', (event) => {
      let hoveredElement = event.data.over
      this.destinationIndex = hoveredElement.dataset.index
      this.destinationStorageId = hoveredElement.closest(".storage").dataset.storageId
    })
    draggable.on('drag:out', (event) => {
      this.destinationIndex = null
      this.destinationStorageId = null
    })
    draggable.on('drag:stop', (event) => {
      this.isDragging = false

      const sourceIndex = event.data.source.dataset.index
      const sourceStorageId = event.data.source.closest(".storage").dataset.storageId

      let isPositionChanged = this.destinationIndex && this.destinationIndex !== sourceIndex
      if (isPositionChanged) {
        event.data.originalSource.classList.add("hidden")
      } else {
        event.data.originalSource.classList.remove("hidden")
      }


      if (this.destinationStorageId !== null) {
        let data = {
          sourceStorageId: sourceStorageId,
          sourceIndex: sourceIndex,
          destinationStorageId: this.destinationStorageId
        }

        if (this.destinationIndex) {
          data['destinationIndex'] =  this.destinationIndex
        }

        SocketUtil.emit("SwapInventory", data)
      }
    })
  }

  openInventory() {
    this.inventoryMenu.open()
  }

  initConstants() {
    this.CAMERA_WIDTH = Constants.cameraWidth
    this.CAMERA_HEIGHT = Constants.cameraHeight
    this.MAX_ZOOM_LEVEL = debugMode ? 5 : (this.isMobile() ? 4 : 3)
    this.MIN_ZOOM_LEVEL = 0.5
  }

  isEntityMenuOpenFor(entity) {
    return this.entityMenu.isOpen(entity)
  }

  getOpenNonEntityMenus() {
    return this.openMenus.filter((menu) => {
      return !menu.isEntityMenu()
    })
  }

  closeEntityMenu() {
    this.entityMenu.close()
  }

  interact(entity) {
    if (entity.hasMenu() && entity.canMenuBeOpened()) {
      entity.openMenu()
    }

    if (entity.isBuildingType()) {
      this.lastInteractEntityId = entity.id
    }

    if (entity.shouldSendInteractTargetToServer()) {
      SocketUtil.emit("InteractTarget", { id: entity.id })
    }
  }

  interactEmpty() {
    if (this.player && this.player.getMount()) {
      SocketUtil.emit("InteractTarget", { id: this.player.getMount().id })
    }
  }

  isLeaderAndOwner(entity, team, player) {
    if (!team) return false
    if (!entity.owner) return false
      
    let teamId = team.id
    let ownerId = entity.owner.id

    return ownerId === teamId &&
           team.leader && team.leader.id === player.id
  }

  renderUpgradeDetails(entity) {
    const upgradeProgress = entity.getUpgradeProgress()
    let isMaxUpgradeReached = entity.isMaxUpgradeReached()
    let missingResources = {}

    let stats


    if (isMaxUpgradeReached) {
      this.entityMenu.querySelector(".upgrade_cost").style.display = 'none'
      this.entityMenu.querySelector("#upgrade_btn").querySelector(".action_label").innerText = "Max"
      stats = { health: { before: entity.getMaxHealth() }, damage: { before: entity.getDamage() } , range: { before: entity.getRange() } }

    } else {
      this.entityMenu.querySelector(".upgrade_cost").style.display = 'block'
      stats = upgradeProgress

      if (entity.level > entity.container.level) {
        this.entityMenu.querySelector("#upgrade_btn").querySelector(".action_label").innerText = "Upgrade Ship"
        this.entityMenu.querySelector("#upgrade_btn").className = "disabled"
        this.entityMenu.querySelector(".upgrade_cost_gold").innerText = ""
        isMaxUpgradeReached = true
      } else {
        this.entityMenu.querySelector("#upgrade_btn").querySelector(".action_label").innerText = "Upgrade"
        this.entityMenu.querySelector("#upgrade_btn").className = ""
        // const cost = entity.getUpgradeCost()
        // missingResources = player.getMissingResources(cost)

        // this.entityMenu.querySelector(".upgrade_cost_gold").innerText = cost.gold ? cost.gold + " gold" : ""
      }
    }

    // let statsGrowth = ""
    // for (let statKey in stats) {
    //   if (statKey === "count") continue // dont show count (HACK: refactor this. not easily seen)

    //   let progress = stats[statKey]
    //   let changedKlass = progress.before !== progress.after ? "changed" : ""
    //   let el = "<div class='stats_growth'>" +
    //              "<div class='stats_type'>" + statKey + "</div>" +
    //              "<div class='stats_after " + changedKlass + "'>" + (progress.after ? progress.after : "" ) + "</div>" +
    //              "<div class='stats_before'>" + progress.before + "</div>" +
    //            "</div>"
    //   statsGrowth += el
    // }

    // this.entityMenu.querySelector(".entity_stats_target_growth").innerHTML = statsGrowth


    // // classnames
    // this.entityMenu.querySelector(".upgrade_cost_gold").className = "upgrade_cost_gold"

    // // show which is missing
    // for (let missingResource in missingResources) {
    //   this.entityMenu.querySelector(".upgrade_cost_" + missingResource).className += " missing"
    // }

    // // indicate where button is disabled
    // if (Object.keys(missingResources).length > 0 || isMaxUpgradeReached) {
    //   this.entityMenu.querySelector("#upgrade_btn").className = "disabled"
    // } else {
    //   this.entityMenu.querySelector("#upgrade_btn").className = ""
    // }
  }

  renderSellDetails(entity) {
    if (entity.isNotForSale()) {
      document.querySelector("#sell_btn .action_label").innerText = 'Not for Sale'
      document.querySelector("#sell_btn").className = "disabled"
      this.entityMenu.querySelector("#sell_cost").innerText = ""
    } else {
      document.querySelector("#sell_btn .action_label").innerText = 'Sell'
      document.querySelector("#sell_btn").className = ""

      const sell = entity.getSellCost()
      const sellDetails = Object.keys(sell).map((resourceName) => { return [sell[resourceName], resourceName].join(" ")  } ).join(", ")
      this.entityMenu.el.querySelector("#sell_cost").innerText = sellDetails.length > 0 ? sellDetails : ""
    }
  }

  closeAllMenus() {
    if (!this.openMenus) return
    let maxIteration = 50
    while (this.openMenus.length > 0 && maxIteration > 0) {
      this.openMenus[0].close()
      maxIteration -= 1
    }
  }

  closeAllMenusForced() {
    // even menus that are persistent
    this.openMenus.forEach((menu) => {
      menu.close({ manualUnregister: true })
    })
    this.openMenus = []
  }

  closeLastMenu() {
    let lastMenu = this.openMenus[this.openMenus.length - 1]
    lastMenu.close()
  }

  showEntityMenu(entity, options = {}) {
    options["dontCloseMenus"] = true
    this.entityMenu.open(entity, options)
  }

  shouldShowDebugDetails() {
    if (this.isAdminMode) return true
    let isSandboxOwner = this.isPeaceful() && this.player.isSectorOwner()
    if (isSandboxOwner) return true

    return game.player.getRole() &&
           game.player.getRole().permissions["UseCommands"]
  }

  hideEntityMenu(entity) {
    this.entityMenu.close()
  }

  getHighlightedEntity() {
    if (!this.sector) return null
    return this.sector.selection.selectedEntity || 
           this.sector.persistentSelection.selectedEntity
  }

  highlight(entity) {
    this.sector.highlight(entity)
  }

  unhighlight(entity) {
    this.sector.unhighlight(entity)
  }

  setMobileAction(action) {
    document.querySelector("#mobile_action_btn").innerText = i18n.t(action)
  }

  setDefaultMobileAction() {
    if (this.player.getMount()) {
      document.querySelector("#mobile_action_btn").innerText = "Unmount"
    } else {
      document.querySelector("#mobile_action_btn").innerText = ""
    }
    
  }

  hideActionTooltip() {
    if (!this.isActionTooltipShown) return

    this.isActionTooltipShown = false
    document.querySelector("#player_action_tooltip").style.display = 'none'
  }

  showActionTooltip(entity) {
    if (this.isActionTooltipShown) return

    this.isActionTooltipShown = true

    let tooltipMessage = entity.getActionTooltipMessage()

    if (tooltipMessage) {
      document.querySelector("#player_action_tooltip").className = ""
      document.querySelector("#action_tooltip_message").innerText = tooltipMessage
    } else {
      document.querySelector("#player_action_tooltip").className = ""
      document.querySelector("#action_tooltip_message").innerText = ""
    }

    document.querySelector("#player_action_tooltip").style.display = 'block'
    let tooltipWidth = document.querySelector("#player_action_tooltip").offsetWidth
    document.querySelector("#player_action_tooltip").style.top = "35%"
    document.querySelector("#player_action_tooltip").style.left = (window.innerWidth/2 - tooltipWidth/2) + "px"
  }

  getNewBuildingStatsHTML(buildingKlass) {
    let statsEl = ""

    const stats = buildingKlass.getUpgradeProgress()

    for (let statKey in stats) {
      if (statKey === "count") continue // dont show count (HACK: refactor this. not easily seen)

      let progress = stats[statKey]
      let el = "<div class='stats_growth'>" +
                 "<div class='stats_type'>" + statKey + "</div>" +
                 "<div class='stats_before'>" + progress.before + "</div>" +
               "</div>"
      statsEl += el
    }

    return statsEl
  }

  hideBuildMenuFor(buildingKlass) {

  }

  getTeam(teamId) {
    return this.teams[teamId]
  }

  getTeamCount() {
    return Object.keys(this.teams).length
  }

  initWorld() {
    window.worldSetupTime = (new Date()).getTime()

    this.initRenderer()
    this.initComponents()
    this.initFloorColors()
    this.initSuitColors()
    this.initFloorTextures()

    Protocol.initClient((error, protocol) => {
      if (error) {
        this.main.onPlayerCantJoin({ message: i18n.t('NetworkOutdatedGameClient') })
        return
      }

      SocketUtil.init({ protocol: protocol })
      this.initSocketHandlers()
      Buildings.Floors.Floor.initAttributeHandlers()

      this.initTextures(() => {
        this.initUI()
        this.generateArmorTextures() // only at this point would TextureCache be populated
        this.createHudAlert()

        this.main.onGameInitialized()
        this.initSoundManager()
      })
    })

  }

  getSoundNames() {
    return this.getBackgroundSoundNames().concat(this.getEffectsSoundNames())
  }

  getBackgroundSoundNames() {
    return ["peaceful", "enemy_invasion", "meeting", "anotherplanet"]
  }

  getEffectsSoundNames() {
    return ["raid_2", "melee_hit", "airlock", "pistol", "machine_gun_2_b",
            "pickup", "place_object", "shotgun", "light_laser", "rock_grind",
            "assault_rifle", "explosion", "missile",
            "harvest_plant", "melee_damage",
            "water_step", "flame", "gas_release", "burning", "eating", "saber_one", "saber_two", "alert", "tesla",
            "cannon", "plasma_gun", "bubble"]
  }

  initSoundManager() {
    this.sounds = {}
    this.currentSounds = {}

    let soundNames = this.getSoundNames()

    soundNames.forEach((soundName) => {
      this.sounds[soundName] = this.createSound(soundName)
    })

    this.setEffectsVolume(this.getSavedOrDefaultEffectsVolume())
    this.setBackgroundVolume(this.getSavedOrDefaultBackgroundVolume())
  }

  getSavedOrDefaultEffectsVolume() {
    let effectsVolume = Cookies.get("effects_volume")
    if (typeof effectsVolume !== 'undefined') {
      return parseFloat(effectsVolume)
    } else {
      return Constants.defaultVolume
    }
  }

  getSavedOrDefaultBackgroundVolume() {
    if (debugMode) return 0

    let backgroundVolume = Cookies.get("background_volume")
    if (typeof backgroundVolume !== 'undefined') {
      return parseFloat(backgroundVolume)
    } else {
      return Constants.defaultBackgroundVolume
    }
  }

  isSoundRecentlyPlayed(name, interval) {
    let result = false

    let soundData = this.currentSounds[name]
    if (soundData) {
      let elapsed = Date.now() - soundData.lastPlayedTime
      if (elapsed < interval) {
        result = true
      }
    }

    return result
  }

  playSoundLazyDownload(name, options = {}) {
    if (!this.loadedSounds[name]) {
      this.loadSound(name, () => {
        this.playSound(name, options)
      })
    } else {
      this.playSound(name, options)
    }
  }

  playSound(name, options = {}) {
    if (!this.loadedSounds[name]) return

    let sound = this.sounds[name]

    if (options.minInterval) {
      if (this.isSoundRecentlyPlayed(name, options.minInterval)) {
        return
      }
    }

    if (this.isSoundAlreadyPlaying(name)) {
      if (options.skipIfPlaying) {
        return
      } else {
        sound.stop()
      }
    }

    if (options.loop) {
      sound.loop(true)
    }

    let soundId

    try {
      soundId = sound.play()
      this.addCurrentSound(name, options.shouldDelete)
    } catch(e) {
      console.error(e)
    }

    return soundId
  }

  stopSound(name) {
    let sound = this.sounds[name]
    if (sound) {
      try {
        sound.stop()
      } catch(e) {
        console.error(e)
      }
    }
  }

  isSoundAlreadyPlaying(name) {
    return this.sounds[name] && this.sounds[name].playing()
  }

  addCurrentSound(name, shouldDelete = true) {
    this.currentSounds[name] = {
      lastPlayedTime: Date.now(),
      shouldDelete: shouldDelete
    }
  }

  removeCurrentSound(name) {
    if (this.currentSounds[name] && this.currentSounds[name].shouldDelete) {
      delete this.currentSounds[name]
    }
  }

  loadSound(name, cb) {
    let sound = new Howl({
      src: ['/assets/sounds/' + name + '.mp3'],
      volume: 0.5,
      onload: () => {
        this.loadedSounds[name] = true
        cb()
      },
      onend: () => {
        this.removeCurrentSound(name)
      }
    })
    
    this.sounds[name] = sound
  }

  createSound(name) {
    return new Howl({
      src: ['/assets/sounds/' + name + '.mp3'],
      volume: 0.5,
      onload: this.onSoundLoad.bind(this, name),
      onend: this.onSoundEnd.bind(this, name)
    })
  }

  onSoundLoad(name) {
    this.loadedSounds[name] = true
  }

  onSoundEnd(name) {
    this.removeCurrentSound(name)
  }

  calculatePing() {
    this.pingTime = (new Date()).getTime()
    SocketUtil.emit("Ping", {})
  }

  onPong() {
    let pongTime = (new Date()).getTime()
    let ping = (pongTime - this.pingTime)

    let pingEl = document.querySelector("#performance_stats #ping .value")
    if (pingEl) {
      pingEl.innerText = ping + " ms"
    }

  }

  onSetAdmin(data) {
    this.isAdminMode = data.isAdminMode
    this.initAdditionalLibraries()
  }

  initAdditionalLibraries() {
    if (this.isInitialAdminSetup && this.isAdminMode) {
      this.isInitialAdminSetup = false
      this.main.initAdditionalLibraries()
    }
  }

  onEvent(data) {
    let event = this.parseEvent(data.type, data.eventData)
    if (event) {
      this.handleGameEvent(event)
    }
  }

  parseEvent(type, eventData) {
    switch(type) {
      case Protocol.definition().EventType.TaxCollection:
        return {
          description: i18n.t("Events.TaxCollection"),
          class: null,
          sound: null
        }
        break
      case Protocol.definition().EventType.RaidWarning:
        return {
          description: i18n.t("Events.RaidWarning"),
          class: "danger_event",
          sound: "raid_2",
          countdown: 1 * Constants.secondsPerHour * Constants.physicsTimeStep
        }
        break
      case Protocol.definition().EventType.FixLights:
        return {
          description: i18n.t("Events.FixLights"),
          class: "danger_event",
          id: "fix_lights_event",
          countdown: 90 * Constants.physicsTimeStep,
          handler: "startFixLights"
        }
        break
      case Protocol.definition().EventType.FixLightsEnd:
        return {
          description: i18n.t("Events.FixLightsEnd"),
          handler: "stopFixLights"
        }
        break
      case Protocol.definition().EventType.Alarm:
        return {
          description: i18n.t("Events.Alarm"),
          class: "danger_event",
          handler: "startAlarm",
          id: "alarm_event",
          countdown: 30 * Constants.physicsTimeStep
        }
        break
      case Protocol.definition().EventType.AlarmEnd:
        return {
          description: i18n.t("Events.AlarmEnd"),
          handler: "stopAlarm",
          skipDisplay: true
        }
        break
      case Protocol.definition().EventType.RaidEnd:
        return {
          description: i18n.t("Events.RaidEnd"),
          handler: "stopRaidMusic"
        }
        break
      case Protocol.definition().EventType.TraderArrived:
        return {
          description: i18n.t("Events.TraderArrived"),
          class: null,
          sound: null
        }
        break
      case Protocol.definition().EventType.SlaveTraderArrived:
        return {
          description: i18n.t("Events.SlaveTraderArrived"),
          class: null,
          sound: null
        }
        break
      case Protocol.definition().EventType.SpiderInfestation:
        return {
          description: i18n.t("Events.SpiderInfestation"),
          class: "danger_event",
          sound: "raid_2"
        }
        break
      case Protocol.definition().EventType.MeteorShower:
        return {
          description: i18n.t("Events.MeteorShower"),
          class: "danger_event",
          sound: "raid_2",
          countdown: 1 * Constants.secondsPerHour * Constants.physicsTimeStep,
          onCountdownStart: () => {
            let chunkKey = JSON.parse(eventData).chunkKey
            if (chunkKey) {
              let chunkRow = chunkKey.split("-")[0]
              let chunkCol = chunkKey.split("-")[1]
              this.mapMenu.addAlert(chunkRow, chunkCol)
            }
          },
          onCountdownStop: () => {
            let chunkKey = JSON.parse(eventData).chunkKey
            if (chunkKey) {
              let chunkRow = chunkKey.split("-")[0]
              let chunkCol = chunkKey.split("-")[1]
              this.mapMenu.removeAlert(chunkRow, chunkCol)
            }
          }
        }
        break
      case Protocol.definition().EventType.MeteorShowerImmediate:
        return {
          description: i18n.t("Events.MeteorShower"),
          class: "danger_event",
          sound: "raid_2",
          countdown: 5 * Constants.physicsTimeStep,
          onCountdownStart: () => {
            let chunkKey = JSON.parse(eventData).chunkKey
            if (chunkKey) {
              let chunkRow = chunkKey.split("-")[0]
              let chunkCol = chunkKey.split("-")[1]
              this.mapMenu.addAlert(chunkRow, chunkCol)
            }
          },
          onCountdownStop: () => {
            let chunkKey = JSON.parse(eventData).chunkKey
            if (chunkKey) {
              let chunkRow = chunkKey.split("-")[0]
              let chunkCol = chunkKey.split("-")[1]
              this.mapMenu.removeAlert(chunkRow, chunkCol)
            }
          }
        }
        break
      default:
        return null
    }
  }

  // https://codepen.io/chles/pen/aNxMxQ
  startScreenWarp() {
    if (!this.displacementSprite) {
      this.displacementSprite = new PIXI.Sprite(PIXI.utils.TextureCache["displacement_map.png"])
      this.displacementSprite.scale.set(2)
      this.displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT

      this.displacementFilter = new PIXI.filters.DisplacementFilter(this.displacementSprite)
    }

    this.app.stage.addChild(this.displacementSprite)
    this.app.stage.filters = [this.displacementFilter]

    let count = 0

    this.screenWarpInterval = setInterval(() => {
      this.displacementSprite.position.x = count * 10
      this.displacementSprite.position.y = count * 10

      count += 0.20
    }, 30)
  }

  stopScreenWarp() {
    if (!this.displacementSprite) return
    this.app.stage.removeChild(this.displacementSprite)
    this.app.stage.filters = []
    this.displacementSprite.position.x = 0
    this.displacementSprite.position.y = 0
    clearInterval(this.screenWarpInterval)
  }

  screenShake() {
    if (this.screenShakeTween) return

    let targetSprite = this.app.stage
    let origY = targetSprite.position.y
    let position = { y: origY }
    let quakeMagnitude = 5

    this.screenShakeTween = new TWEEN.Tween(position)
        .to({ y: origY + quakeMagnitude  }, 60)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })

    let bTween = new TWEEN.Tween(position)
        .to({ y: origY - quakeMagnitude  }, 160)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })

    let cTween = new TWEEN.Tween(position)
        .to({ y: origY + quakeMagnitude  }, 60)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })

    let dTween = new TWEEN.Tween(position)
        .to({ y: origY - quakeMagnitude  }, 160)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })

    let eTween = new TWEEN.Tween(position)
        .to({ y: origY + quakeMagnitude  }, 60)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })

    let fTween = new TWEEN.Tween(position)
        .to({ y: origY - quakeMagnitude  }, 160)
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            targetSprite.position.y = position.y
        })
        .onComplete(() => {
            targetSprite.position.y = origY
            this.screenShakeTween = null
        })

    this.screenShakeTween.chain(bTween)
    bTween.chain(cTween)
    cTween.chain(dTween)
    dTween.chain(eTween)
    eTween.chain(fTween)

    this.screenShakeTween.start()
  }

  handleGameEvent(event) {
    let eventsMenu = document.querySelector("#events_menu")

    let eventItem 

    if (!event.skipDisplay) {
      eventItem = document.createElement("div")
      eventItem.classList.add("event_item")
      if (event.class) {
        eventItem.classList.add(event.class)
      }

      if (event.id) {
        eventItem.id = event.id
      }

      eventsMenu.appendChild(eventItem)
    }

    if (event.countdown) {
      if (event.onCountdownStart) {
        event.onCountdownStart()
      }
      let occurTimestamp = this.timestamp + event.countdown
      this.eventCountdownIntervals[event.description] = setInterval(() => {
        let timeRemainingInSeconds = Math.floor((occurTimestamp - this.timestamp) / Constants.physicsTimeStep)
        let formattedTimeRemaining = Helper.stringifyTimeShort(timeRemainingInSeconds)
        eventItem.innerText = event.description + " " + formattedTimeRemaining
        if (timeRemainingInSeconds <= 0) {
          if (eventItem.parentElement) {
            eventItem.parentElement.removeChild(eventItem)
          }
          if (event.onCountdownStop) {
            event.onCountdownStop()
          }
          clearInterval(this.eventCountdownIntervals[event.description])
          let errorFadeOutTween = ClientHelper.getFadeTween(eventItem, 1, 0)
          errorFadeOutTween.start()
        }

      }, 1000)
    } else {
      if (!event.skipDisplay) {
        eventItem.innerText = event.description
        setTimeout(() => {
          if (eventItem.parentElement) {
            eventItem.parentElement.removeChild(eventItem)
          }
        }, 6000)

        let errorFadeOutTween = ClientHelper.getFadeTween(eventItem, 1, 0, 5000)
        errorFadeOutTween.start()
      }
    }


    if (event.sound) {
      this.playSound(event.sound)
    }

    if (event.handler) {
      let handler = this[event.handler]
      handler.call(this)
    }
  }

  togglePerformanceDebug() {
    let el = document.querySelector("#performance_stats")

    if (el.style.display === 'block') {
      el.style.display = 'none'
    } else {
      el.style.display = 'block'
    }
  }

  initSector(data) {
    this.sector = new Sector(this, data)
    this.gameLayer.addChild(this.sector.sprite)
  }

  startHudAlertTween() {
    if (this.hudAlertTween) return

    this.app.stage.addChild(this.hudAlertContainer)
    document.querySelector(".hud_alert_container").style.display = 'block'

    let alpha = { alpha: this.hudAlertContainer.alpha }

    this.hudAlertTween = new TWEEN.Tween(alpha)
        .to({ alpha: 0.1 }, 800)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.hudAlertContainer.alpha = alpha.alpha
          document.querySelector(".hud_alert_container").style.opacity = 0.1 + alpha.alpha
        })
        .yoyo(true)
        .repeat(Infinity)

    this.hudAlertTween.start()
  }

  stopHudAlertTween() {
    if (!this.hudAlertTween) return

    this.hudAlertTween.stop()
    this.hudAlertTween = null

    this.hudAlertContainer.parent.removeChild(this.hudAlertContainer)
    document.querySelector(".hud_alert_container").style.display = 'none'
  }

  createHudAlert() {
    this.hudAlertContainer = new PIXI.Sprite(PIXI.utils.TextureCache["white.png"])
    this.hudAlertContainer.name = "HudAlertContainer"
    this.hudAlertContainer.alpha = 0.4
    this.hudAlertContainer.tint = 0xff0000
    this.hudAlertContainer.width = window.innerWidth
    this.hudAlertContainer.height = window.innerHeight
  }

  initComponents() {
    this.regionManager = new RegionManager(this)
  }

  isSelectingRegion() {
    return this.regionManager.isSelectingRegion
  }

  renderRegionBlockAtMousePosition(clientX, clientY) {
    this.regionManager.renderRegionBlockAtMousePosition(clientX, clientY)
  }

  hasRegionStart() {
    return this.regionManager.regionStart
  }

  setRegionStart() {
    this.regionManager.setRegionStart()
  }

  clearRegion() {
    this.regionManager.clearRegion()
  }

  createRegion() {
    this.regionManager.createRegion()
  }

  getShipBuildings() {
    return [
      Buildings.Structures.ShipCore,
      Buildings.Structures.Thruster,
      Buildings.Structures.Reactor,
      Buildings.Structures.Bridge,
      Buildings.Structures.ShieldGenerator
    ]
  }

  distanceBetween(entity, otherEntity) {
    if (entity.getContainer().isMovable()) {
      return this.distance(entity.getRelativeX(), entity.getRelativeY(), otherEntity.getRelativeX(), otherEntity.getRelativeY())
    } else {
      return this.distance(entity.getX(), entity.getY(), otherEntity.getX(), otherEntity.getY())
    }
  }

  distance(x1, y1, x2, y2) {
    return Helper.distance(x1, y1, x2, y2)
  }

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1)
  }

  getPlainArmorSprite(){
    if (!this.plainArmorSprite) {
      let container = new PIXI.Container()
      container.name = "SpaceSuitContainer"
      container.pivot.x = 100
      container.pivot.y = 0

      if (!this.isCanvasMode()) {
        container.rotation = -Math.PI/2
        container.scale.set(0.69)
      }

      this.plainArmorSprite = container

      let texture = PIXI.utils.TextureCache["space_helmet_base.png"]
      this.plainArmorSprite.baseSprite = new PIXI.Sprite(texture)
      this.plainArmorSprite.baseSprite.name = "BaseSprite"
      this.plainArmorSprite.baseSprite.tint = 0x999999

      texture = PIXI.utils.TextureCache["space_helmet_eye.png"]
      this.plainArmorSprite.eyeSprite = new PIXI.Sprite(texture)
      this.plainArmorSprite.eyeSprite.name = "EyeSprite"
      this.plainArmorSprite.eyeSprite.position.x = 15
      this.plainArmorSprite.eyeSprite.position.y = 48

      container.addChild(this.plainArmorSprite.baseSprite)
      container.addChild(this.plainArmorSprite.eyeSprite)
    }

    return this.plainArmorSprite

  }

  generateArmorTextures() {
    let sprite = this.getPlainArmorSprite()

    sprite.eyeSprite.tint = 0x78eb76
    let armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["gray"] = armorTexture

    sprite.baseSprite.tint = 0xc81010
    sprite.eyeSprite.tint = 0xacd8fe
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["red"] = armorTexture

    sprite.baseSprite.tint = 0x186638
    sprite.eyeSprite.tint = 0xacd8fe
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["green"] = armorTexture

    sprite.baseSprite.tint = 0x245e9b
    sprite.eyeSprite.tint = 0x78eb76
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["blue"] = armorTexture

    sprite.baseSprite.tint = 0xf3b61d
    sprite.eyeSprite.tint = 0x78eb76
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["yellow"] = armorTexture

    sprite.baseSprite.tint = 0x6e3797
    sprite.eyeSprite.tint = 0x78eb76
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["purple"] = armorTexture

    sprite.baseSprite.tint = 0xeb4c1a
    sprite.eyeSprite.tint = 0x78eb76
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["orange"] = armorTexture

    sprite.baseSprite.tint = 0x222222
    sprite.eyeSprite.tint = 0x78eb76
    armorTexture = this.app.renderer.generateTexture(sprite)
    this.armorTextures["black"] = armorTexture
  }

  initTextures(cb) {
    window.textureSetupTime = (new Date()).getTime()

    // PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST

    let tempAssets = ['displacement_map.png', 'squid_lord_heart.png', 'squid_staff.png', 'fries.png', 'energy_drink.png', 'alien_juice.png', 'rocket_launcher.png', 'scar_17_by_px.png', 'bowl_by_px.png', 'potato_soup_by_px.png', 'miso_soup_by_px.png', 'slime_broth_by_px.png', 'bomber_turret_by_px.png', 'firebat.png', 'plasma_blade.png', 'raven.png']
    tempAssets.forEach((asset) => {
      PIXI.Texture.addToCache(PIXI.Texture.fromImage('/assets/images/' + asset), asset)
    })

    // graphics texture
    let preloadedGraphics = this.getPreloadedGraphics()
    for (let key in preloadedGraphics) {
      let graphic = preloadedGraphics[key]
      let texture = this.app.renderer.generateTexture(graphic)
      PIXI.Texture.addToCache(texture, key)
    }

    PIXI.loader
      .add("/assets/images/background/atlas-2222.json")
      .add("/assets/images/cc.fnt")
      .load((loader, resources) => {
        let selfTime = (new Date()).getTime() - window.textureSetupTime
        let time = (new Date()).getTime() - window.initializeTime
        cb()
    })
  }

  getPreloadedGraphics() {
    return {
      "los_range.png": this.getAttackRangeGraphics()
    }
  }

  getAttackRangeGraphics() {
    const largestRange = 500

    const graphics = new PIXI.Graphics()
    graphics.beginFill(0xc59bff)
    graphics.drawCircle(0, 0, largestRange)
    graphics.endFill()

    return graphics
  }

  openInGameMenu() {
    document.querySelector("#welcome_container").classList.add("in_game")
    document.querySelector("#welcome_container").style.display = 'block'

    this.main.showMainMenu()
    this.hideActionTooltip()
    this.hideGameHuds()
  }

  closeInGameMenu() {
    this.main.onBackMainMenuBtnClick()

    document.querySelector("#welcome_container").classList.remove("in_game")
    document.querySelector("#welcome_container").style.display = 'none'
    this.showGameHuds()
  }

  emitPlayerPositionChanged() {
    this.player.onPositionChanged()
  }

  initSocketHandlers() {
    SocketUtil.on("GameState", this.onSyncWithServer.bind(this))
    SocketUtil.on("JoinGame", this.onJoinGame.bind(this))
    SocketUtil.on("EndGame", this.onEndGame.bind(this))
    SocketUtil.on("CantJoin", this.onPlayerCantJoin.bind(this))
    SocketUtil.on("Respawn", this.onPlayerRespawn.bind(this))
    SocketUtil.on("Leaderboard", this.onLeaderboard.bind(this))
    SocketUtil.on("OtherPlayerJoined", this.onOtherPlayerJoined.bind(this))
    SocketUtil.on("CeilingHit", this.onCeilingHit.bind(this))
    SocketUtil.on("WaveLevel", this.onWaveLevel.bind(this))
    SocketUtil.on("PlayerDestroyed", this.onPlayerDestroyed.bind(this))
    SocketUtil.on("MothershipRepaired", this.onMothershipRepaired.bind(this))
    SocketUtil.on("CollisionDetected", this.onCollisionDetected.bind(this))
    SocketUtil.on("CircleCollision", this.onCircleCollision.bind(this))
    SocketUtil.on("WaveEnd", this.onWaveEnd.bind(this))
    SocketUtil.on("RepairStarted", this.onRepairStarted.bind(this))
    SocketUtil.on("RenderStorage", this.onRenderStorage.bind(this))
    SocketUtil.on("Teleport", this.onTeleport.bind(this))
    SocketUtil.on("ErrorMessage", this.onErrorMessage.bind(this))
    SocketUtil.on("MineralCapacityReached", this.onMineralCapacityReached.bind(this))
    SocketUtil.on("ShowStarMap", this.onShowStarMap.bind(this))
    SocketUtil.on("ServerChat", this.onServerChat.bind(this))
    SocketUtil.on("CraftSuccess", this.onCraftSuccess.bind(this))
    SocketUtil.on("RenderDebug", this.onRenderDebug.bind(this))
    SocketUtil.on("CameraFocusTarget", this.onCameraFocusTarget.bind(this))
    SocketUtil.on("GainResource", this.onGainResource.bind(this))
    SocketUtil.on("Chunk", this.onChunk.bind(this))
    SocketUtil.on("EntityUpdated", this.onEntityUpdated.bind(this))
    SocketUtil.on("RoomTileUpdated", this.onRoomTileUpdated.bind(this))
    SocketUtil.on("SetTutorialIndex", this.onSetTutorialIndex.bind(this))
    SocketUtil.on("Pong", this.onPong.bind(this))
    SocketUtil.on("SetAdmin", this.onSetAdmin.bind(this))
    SocketUtil.on("Event", this.onEvent.bind(this))
    SocketUtil.on("UpdateStats", this.onUpdateStats.bind(this))
    SocketUtil.on("BreakBuilding", this.onBreakBuilding.bind(this))
    SocketUtil.on("DebugRange", this.onDebugRange.bind(this))
    SocketUtil.on("Animate", this.onAnimate.bind(this))
    SocketUtil.on("ProgressCircle", this.onProgressCircle.bind(this))
    SocketUtil.on("TeamUpdated", this.onTeamUpdated.bind(this))
    SocketUtil.on("RoleUpdated", this.onRoleUpdated.bind(this))
    SocketUtil.on("MapPositions", this.onMapPositions.bind(this))
    SocketUtil.on("TeamRequest", this.onTeamRequest.bind(this))
    SocketUtil.on("TeamInvitation", this.onTeamInvitation.bind(this))
    SocketUtil.on("FlowField", this.onFlowField.bind(this))
    SocketUtil.on("ServerRestartCountdown", this.onServerRestartCountdown.bind(this))
    SocketUtil.on("UpdateTeamHealth", this.onUpdateTeamHealth.bind(this))
    SocketUtil.on("EnterSector", this.onEnterSector.bind(this))
    SocketUtil.on("LeaveSector", this.onLeaveSector.bind(this))
    SocketUtil.on("UpdateHomeArea", this.onUpdateHomeArea.bind(this))
    SocketUtil.on("AFK", this.onAFK.bind(this))
    SocketUtil.on("UpdateChunkRegion", this.onUpdateChunkRegion.bind(this))
    SocketUtil.on("UpdateChunkRegionPath", this.onUpdateChunkRegionPath.bind(this))
    SocketUtil.on("SessionResume", this.onSessionResume.bind(this))
    SocketUtil.on("InventoryChanged", this.onInventoryChanged.bind(this))
    SocketUtil.on("EquipIndexChanged", this.onEquipIndexChanged.bind(this))
    SocketUtil.on("SaveProgress", this.onSaveProgress.bind(this))
    SocketUtil.on("ChunkPositionChanged", this.onChunkPositionChanged.bind(this))
    SocketUtil.on("RoomHovered", this.onRoomHovered.bind(this))
    SocketUtil.on("EntityChunkRegionPath", this.onEntityChunkRegionPath.bind(this))
    SocketUtil.on("PlayerKick", this.onPlayerKick.bind(this))
    SocketUtil.on("RemovedFromGame", this.onRemovedFromGame.bind(this))
    SocketUtil.on("NPCServerMessage", this.onNPCServerMessage.bind(this))
    SocketUtil.on("RailDestinations", this.onRailDestinations.bind(this))
    SocketUtil.on("PlaySound", this.onPlaySound.bind(this))
    SocketUtil.on("ScreenshotUpdated", this.onScreenshotUpdated.bind(this))
    SocketUtil.on("AccountBalance", this.onAccountBalance.bind(this))
    SocketUtil.on("FavoriteUpdated", this.onFavoriteUpdated.bind(this))
    SocketUtil.on("SectorUpdated", this.onSectorUpdated.bind(this))
    SocketUtil.on("SellableUpdated", this.onSellableUpdated.bind(this))
    SocketUtil.on("TeamResidentsUpdated", this.onTeamResidentsUpdated.bind(this))
    SocketUtil.on("WalkthroughUpdated", this.onWalkthroughUpdated.bind(this))
    SocketUtil.on("TeamFull", this.onTeamFull.bind(this))
    SocketUtil.on("TeamLogs", this.onTeamLogs.bind(this))
    SocketUtil.on("RegionUpdated", this.onRegionUpdated.bind(this))
    SocketUtil.on("ButtonUpdated", this.onButtonUpdated.bind(this))
    SocketUtil.on("VoteUpdated", this.onVoteUpdated.bind(this))
    SocketUtil.on("StartScene", this.onStartScene.bind(this))
    SocketUtil.on("EndScene", this.onEndScene.bind(this))
    SocketUtil.on("StartVote", this.onStartVote.bind(this))
    SocketUtil.on("EndVote", this.onEndVote.bind(this))
    SocketUtil.on("SidebarUpdated", this.onSidebarUpdated.bind(this))
    SocketUtil.on("Objective", this.onObjective.bind(this))
    SocketUtil.on("DialogueUpdated", this.onDialogueUpdated.bind(this))
    SocketUtil.on("RoundStarted", this.onRoundStarted.bind(this))
    SocketUtil.on("TeamAssignmentChanged", this.onTeamAssignmentChanged.bind(this))
    SocketUtil.on("CameraFeedUpdated", this.onCameraFeedUpdated.bind(this))
    SocketUtil.on("RenderCamera", this.onRenderCamera.bind(this))
    SocketUtil.on("MapAction", this.onMapAction.bind(this))
    SocketUtil.on("TerminalUpdated", this.onTerminalUpdated.bind(this))
    SocketUtil.on("CustomStats", this.onCustomStats.bind(this))
    SocketUtil.on("MenuAction", this.onMenuAction.bind(this))
    SocketUtil.on("CommandBlockUpdated", this.onCommandBlockUpdated.bind(this))
    SocketUtil.on("CommandEventLog", this.onCommandEventLog.bind(this))
    SocketUtil.on("CommandEventLogList", this.onCommandEventLogList.bind(this))
    SocketUtil.on("CommandBlockTimerUpdated", this.onCommandBlockTimerUpdated.bind(this))
  }

  onCommandBlockTimerUpdated(data) {
    for (let id in data.commandBlockTimers) {
      let timer = data.commandBlockTimers[id]
      if (timer.clientMustDelete) {
        delete this.commandBlockTimers[timer.id] 
      } else {
        this.commandBlockTimers[timer.id] = timer
      }
    }
  }

  addCommandBlockTimer(timer) {
    this.commandBlockTimers[timer.id] = timer
  }

  onMenuAction(data) {
    if (data.action === 'open') {
      let menu = this[data.menu]
      if (menu) {
        menu.open()
      }
    }
  }

  onCommandBlockUpdated(data) {
    if (data.fullJson) {
      this.renderFullCommandBlock(data.fullJson)
      return
    } 

    this.commandBlockMenu.update(data)
  }

  onCommandEventLog(data) {
    this.commandBlockMenu.writeLog(data)
  }

  onCommandEventLogList(data) {
    this.commandBlockMenu.writeLogBatched(data.logs)
  }

  renderFullCommandBlock(fullJson) {
    this.commandBlockMenu.renderFullJson(fullJson)
  }

  onCustomStats(data) {
    if (!this.sector) return
      
    if (data.group === 'mobs') {
      this.sector.setMobCustomStats(data.type, data.stats)
    } else if (data.group === 'buildings') {
      this.sector.setBuildingCustomStats(data.type, data.stats)
    } else if (data.group === 'entities') {
      this.sector.setEntityCustomStats(data.type, data.stats)
    }
  }

  onMapAction(data) {
    if (data.action === "drawDamage") {
      this.mapMenu.drawDamage(data.row, data.col)
    }
  }

  onTerminalUpdated(data) {
    if (data.message) {
      this.sector.addTerminalMessage(data.message)
      if (this.terminalMenu.isOpen()) {
        this.terminalMenu.addTerminalMessage(data.message)
      }
    }
  }

  onStartVote(data) {
    this.voteMenu.open()
    this.voteMenu.setVotingEndTimestamp(data.votingEndTimestamp)
    this.questMenu.close()
  }

  onEndVote(data) {
    this.voteMenu.close()
    this.questMenu.open()
    this.chatMenu.close()

    this.stopMeetingMusic()
  }

  onVoteUpdated(data) {
    this.voteMenu.updateVote(data)
  }

  onRenderCamera(data) {
    this.enterSecurityCameraMode()
  }

  enterSecurityCameraMode() {
    if (this.securityCameraMenu.isOpen()) return

    this.hideActionTooltip()
    this.closeAllMenusForced()
    this.hideGameHuds()
    this.securityCameraMenu.open()
    this.setCustomCanvasSize(512, 512)
    this.resizeCanvas()
    document.querySelector("#home_background").classList.add('security_camera')
  }

  exitSecurityCameraMode() {
    this.setCustomCanvasSize(0, 0)
    this.resizeCanvas()
    document.querySelector("#home_background").classList.remove('security_camera')
    this.showGameHuds()
  }

  onStartScene(data) {
    this.closeAllMenusForced()
    this.isScenePlaying = true
    this.enterMovieMode()
  }

  onSidebarUpdated(data) {
    if (data.hasOwnProperty("isVisible")) {
      this.sidebarMenu.setVisible(data.isVisible)
    }

    if (data.hasOwnProperty("rows")) {
      for (let index in data.rows) {
        let text = data.rows[index]
        this.sidebarMenu.setRowText(index, text)
      }
    }
  }

  onObjective(data) {
    this.questMenu.update(data)
  }

  onDialogueUpdated(data) {
    this.dialogueMap = data.dialogueMap
  }

  onEndScene(data) {
    this.isScenePlaying = false
    this.exitMovieMode()

    if (this.errorFadeOutTween) {
      // clear all caption
      // this.errorFadeOutTween.stop()
      // this.errorContent.innerText = ""
      // this.errorTitle.innerText = ""
    }
  }

  enterMovieMode() {
    this.hideGameHuds()
    this.increaseLetterBox()
  }

  exitMovieMode() {
    this.showGameHuds()
    this.decreaseLetterBox()
  }

  increaseLetterBox() {
    let topBar    = document.querySelector("#top_bar_container")
    let bottomBar = document.querySelector("#bottom_bar_container")

    let height = { height: 45 }
    this.letterBoxTween = new TWEEN.Tween(height)
        .to({ height: 75 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          topBar.style.height = (height.height) + "px"
          bottomBar.style.height = (height.height + 15) + "px"
        })

    this.letterBoxTween.start()
  }

  decreaseLetterBox() {
    let topBar    = document.querySelector("#top_bar_container")
    let bottomBar = document.querySelector("#bottom_bar_container")

    let height = { height: 75 }
    this.letterBoxTween = new TWEEN.Tween(height)
        .to({ height: 45 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          topBar.style.height = (height.height) + "px"
          bottomBar.style.height = (height.height + 15) + "px"
        })

    this.letterBoxTween.start()
  }

  onTeamFull(data) {
    this.teamFullMenu.open(data)
  }

  onTeamLogs(data) {
    this.teamMenu.updateActivityLogs(data.activityLogs)
    this.teamMenu.updateCommandLogs(data.commandLogs)
  }

  onRegionUpdated(data) {
    if (!this.sector) return

    if (data.hasOwnProperty("region")) {
      this.sector.syncGroup(data.region, 'regions')
    }

    if (data.hasOwnProperty("displayRegion")) {
      // is for me
      if (data.playerId === this.playerId) {
        this.showRegions(data.displayRegion)
      }
    }
  }

  onButtonUpdated(data) {
    if (data.hasOwnProperty("button")) {
      this.sector.syncGroup(data.button, 'buttons')
    }
  }

  showRegions(shouldDisplayRegion) {
    if (shouldDisplayRegion) {
      this.sector.regionContainer.visible = true
    } else {
      this.sector.regionContainer.visible = false
    }
  }

  onWalkthroughUpdated(data) {
    this.walkthroughMenu.update(data)
  }

  onNPCServerMessage(data) {
    if (this.npcDialogMenu.entityId === data.entityId) {
      this.npcDialogMenu.close()
    }

    let entity = this.sector.getEntity(data.entityId)
    if (entity) {
      entity.onNPCServerMessage(data)
    }
  }

  onRailDestinations(data) {
    this.railStopMenu.renderDestinations(data)
  }

  onPlaySound(data) {
    let soundName = Helper.getSoundNameById(data.id)
    let clientSoundName = Helper.camelToSnakeCase(soundName)

    if (clientSoundName === "meeting") {
      this.playMeetingMusic()
    } else {
      this.playSound(clientSoundName)
    }
  }

  onPlayerKick(data) {
    this.gameConnection.close()
    if (data.isBan) {
      this.main.onPlayerCantJoin({ message: i18n.t("Player.Banned") })
    } else {
      this.main.onPlayerCantJoin({ message: i18n.t("Player.Kicked") })
    }

    window.history.replaceState(null, null, "?")
    this.displayHomePage()
  }

  onRemovedFromGame(data) {
    // this.gameConnection.displayRemoved()
    this.showPlayerLeaveGameMessage(data.playerName)
    if (this.sector) {
      if (this.isRoundStarted) {
        if (this.sector.originalPlayers[data.playerId] &&
            this.sector.originalPlayers[data.playerId].health === 0) {
          this.sector.setOriginalPlayerLeft(data.playerId)
        } else {
          this.sector.removeFromOriginalPlayers(data.playerId)
        }
      } else {
        this.sector.removeFromOriginalPlayers(data.playerId)
      }
    }

    this.voteMenu.rerenderPlayers()
  }

  displayHomePage() {
    this.removeDataFromPreviousGame()
    this.player = null
    this.isActive = false
    this.hideHUD()
    this.hideGameCanvas()
    this.main.showHomeMenu()
    this.main.hideMainMenu()

    this.main.displayHomePageAd()
  }

  onEntityChunkRegionPath(data) {
    this.sector.onEntityChunkRegionPath(data)
  }

  onRoomHovered(data) {
    let room = this.sector.rooms[data.id]
    if (room) {
      this.updateRoomOxygenBar(room.oxygenPercentage, 100)
    } else {
      // i.e roomId is 0, no room selected
      this.updateRoomOxygenBar(0, 100)
    }

    this.displayRoomSelection(room)
  }

  displayRoomSelection(room) {
    if (this.isRoomDisplayEnabled) {
      if (this.currentRoom !== room) {
        if (this.currentRoom) {
          this.currentRoom.hide()
        }

        if (room) {
          room.show()
        }

        this.currentRoom = room
      }
    }
  }

  onSaveProgress(data) {
    if (!data.finished) {
      document.getElementById("save_progress").style.display = 'block'
    } else {
      setTimeout(() => {
        document.getElementById("save_progress").style.display = 'none'
      }, 700)
    }
  }

  sendToMatchmaker(json) {
    this.main.sendToMatchmaker(json)
  }

  onChunkPositionChanged(data) {
    if (!this.player) return
    let visibleChunks = this.player.getVisibleChunks()
    let chunkKey = [data.row, data.col].join("-")

    // if out of bounds, we dont remove entity
    if (!visibleChunks[chunkKey] && !this.isChunkKeyOutOfBounds(data.row, data.col)) {
      // no longer present in any chunk
      let entity = this.sector.getEntity(data.entityId)
      if (entity) {
        entity.remove()
      }
    }
  }

  isChunkKeyOutOfBounds(row, col) {
    if (row < 0 || row >= this.sector.getRowCount()) return true
    if (col < 0 || col >= this.sector.getColCount()) return true
  }

  onSessionResume(data) {
    this.gameConnection.onSessionResume()
    this.playBackgroundMusic()
  }

  onUpdateHomeArea(data) {
    this.sector.homeArea.syncWithServer(data)
  }

  onHoldItemInventoryChanged(data) {
    if (data.clientMustDelete) {
      this.deleteHoldItemInventorySlot()
    } else if (this.holdItemInventorySlot) {
      this.renderInventorySlot(this.holdItemInventorySlot, data)
    } else {
      this.holdItemInventorySlot = this.createHoldItemInventorySlot()
      this.renderInventorySlot(this.holdItemInventorySlot, data)
      this.renderHoldItemAtMousePosition(this.inputController.lastClientX, this.inputController.lastClientY)
    }
  }

  throwHoldItem() {
    SocketUtil.emit("ManageStack", {
      storageId: Constants.worldStorageId,
      mode: Protocol.definition().StackOperationType.Split
    })
  }

  renderHoldItemAtMousePosition(clientX, clientY) {
    let offset = this.getHoldItemOffset()
    this.holdItemInventorySlot.style.left = (clientX - offset) + "px"
    this.holdItemInventorySlot.style.top = (clientY - offset) + "px"
  }

  getHoldItemOffset() {
    return this.holdItemInventorySlot.offsetWidth + 6
  }

  onAccountBalance(data) {
    this.atmMenu.updateBalance(data.balance)
  }

  onSellableUpdated(data) {
    if (!this.sector) return

    this.sector.setSellables(data.sellables)
    this.sector.setIsCustomSell(data.isCustomSell)
    this.sector.setPurchasables(data.purchasables)

    this.tradeMenu.initPurchasables()
  }

  onSectorUpdated(data) {
    if (!this.sector) return

    if (data.hasOwnProperty("upvoteCount")) {
      document.querySelector(".upvote_count").innerText = data.upvoteCount
    }

    this.teamMenu.updateColonySettings(data.settings)
    this.sector.setSettings(data.settings)

    if (data.hasOwnProperty("gameMode")) {
      this.sector.setGameMode(data.gameMode)
      this.initGameModeUI()
    }

    if (data.hasOwnProperty("sectorBans")) {
      this.sector.setSectorBans(data.sectorBans)
      if (this.teamMenu.activeTeam) {
        this.teamMenu.renderMembers(this.teamMenu.activeTeam)
      }
    }

    if (data.hasOwnProperty("isPrivate")) {
      this.sector.setIsPrivate(data.isPrivate)
      this.teamMenu.setSectorIsPrivate(data.isPrivate)
    }

    if (data.hasOwnProperty("buildSpeed")) {
      this.sector.setBuildSpeed(data.buildSpeed)
    }
  }

  onTeamAssignmentChanged(data) {
    this.roles = data.roles
    this.teamMenu.renderRoles()
  }

  onCameraFeedUpdated(data) {
    this.sector.cameraFeeds = data.cameraFeeds
    this.securityCameraMenu.updateCameraFeeds(this.cameraFeeds)
  }

  onRoundStarted(data) {
    this.isRoundStarted = true

    document.querySelector("#minigame_invite_container").style.display = 'none'
  }

  showMiniGameInviteLink() {
    document.querySelector("#minigame_invite_container").style.display = 'block'
  }

  onFavoriteUpdated(data) {
    if (data.hasOwnProperty("upvoteCount")) {
      this.handleUpvoteUpdated(data)
    }

    if (data.hasOwnProperty("favoriteCount")) {
      this.handleFavoriteUpdated(data)
    }
  }

  handleUpvoteUpdated(data) {
    let oldCount = parseInt(document.querySelector(".upvote_count").innerText)
    document.querySelector(".upvote_count").innerText = data.upvoteCount

    if (data.userUid === this.playerUid) {
      this.renderUpvoteFilled(!data.isRemoved)
    }
  }

  handleFavoriteUpdated(data) {
    if (data.userUid === this.playerUid) {
      if (data.isRemoved) {
        this.main.gameExplorer.removeFavoriteColonies([this.getSectorEntryData()])
      } else {
        this.main.gameExplorer.addFavoriteColonies([this.getSectorEntryData()])
      }
    }

    this.onFavoriteCountChanged()
  }

  onTeamResidentsUpdated(data) {
    this.residents = data.residents
    if (this.slaveTradeMenu.isOpen()) {
      this.slaveTradeMenu.onResidentsChanged()
    }
  }

  getSectorEntryData() {
    let name = this.sector.name

    let sectorEntry = main.gameExplorer.sectorEntries[this.sector.uid]
    if (sectorEntry) {
      name = sectorEntry.data.name
    }

    return {
      "name": name,
      "creatorUid": this.creatorUid,
      "daysAlive": this.day,
      "screenshot": null,
      "uid": this.sector.uid
    }
  }

  renderUpvoteFilled(shouldFill) {
    if (shouldFill) {
      document.querySelector(".upvote_btn").classList.add('filled')
    } else {
      document.querySelector(".upvote_btn").classList.remove('filled')
    }
  }

  onFavoriteCountChanged() {
    let favoriteEntries = this.main.gameExplorer.favoriteColonyEntries
    if (favoriteEntries[this.sector.uid]) {
      // already favorited
      document.querySelector(".sector_favorite_btn").classList.add('filled')
    } else {
      document.querySelector(".sector_favorite_btn").classList.remove('filled')
    }
  }

  updateGoldCount(gold, delta) {

    this.inventoryMenu.updateGoldCount(gold)
    this.tradeMenu.updateGoldCount(gold)
    this.sendMoneyMenu.updateGoldCount(gold, delta)
    this.vendingMachineMenu.updateGoldCount(gold, delta)
    this.atmMenu.updateGoldCount(gold, delta)
    this.slaveTradeMenu.updateGoldCount(gold, delta)

    document.querySelector(".gold.resource_count").innerText = gold
  }

  onInventoryChanged(data) {
    if (!this.player) return
    if (!data.inventory) return

    if (data.inventory.index === Constants.holdItemIndex) {
      this.onHoldItemInventoryChanged(data.inventory)
      return
    }

    this.inventoryMenu.render(data)

    this.openMenus.forEach((menu) => {
      menu.onInventoryChanged(data)
    })

    let index = data.inventory.index
    if (index === this.player.equipIndex) {
      this.player.changeEquip(index)
    }

    if (this.player.isBuilding()) {
      // if building depleted, reset
      let itemData = this.player.getActiveItem()
      if (!itemData) {
        this.player.resetBuildMode()
      }
    }
  }

  onEquipIndexChanged(data) {
    this.renderActiveEquip(data.equipIndex)
    this.player.changeEquip(data.equipIndex)
  }

  onUpdateChunkRegionPath(data) {
    this.sector.syncWithServerForGroups(["chunkRegionPaths"], data)
  }

  onlyUnique(value, index, self) {
    return self.indexOf(value) === index
  }

  onUpdateChunkRegion(data) {
    this.sector.syncWithServerForGroups(["chunkRegions"], data)

    // let chunkIds = data.chunkRegions.map((chunkRegionData) => { return chunkRegionData.chunkId })
    //                    .filter(this.onlyUnique)

    // if (this.visibleChunk && chunkIds.indexOf(this.visibleChunk.getId()) !== -1 ) {
    //   let pos = this.inputController.getGlobalMousePos()
    //   const row = Math.floor(pos.y / Constants.tileSize)
    //   const col = Math.floor(pos.x / Constants.tileSize)
    //   this.visibleChunk.showChunkRegions()
    //   let focusedChunkRegion = this.visibleChunk.getChunkRegion(row, col)
    //   if (focusedChunkRegion) {
    //     focusedChunkRegion.focus()
    //   }
    // }
  }

  onAFK(data) {
    this.isAFK = true
  }

  onMapPositions(data) {
    this.mapMenu.syncWithServer(data)
  }

  onFlowField(data) {
    if (data.clientMustDelete) {
      let path = this.sector.paths[data.id]
      if (path) {
        this.sector.removeEntity(path, "paths", data)
      }
    } else {
      this.sector.renderEntity(data, "paths")
    }
  }

  updateShipStats(ship) {
    this.shipStatSpeed.innerText  = ship.speed
    this.shipStatHealth.innerText = ship.health
    this.shipStatShield.innerText = (ship.shield && ship.shield.health) || 0
    this.shipStatEnergy.innerText = ship.energyUsage + "/" + ship.energyCapacity
    // this.shipStatMiningRate.innerText = player.speed
  }

  onSetTutorialIndex(data) {
    if (!this.shouldShowTutorial()) return

    this.tutorialMenu.update(data)
  }

  onServerRestartCountdown(data) {
    document.getElementById("server_announcement_bar").style.display = 'block'

    this.serverRestartTimestamp = data.timestamp
    this.shutdownReason = data.reason

    clearInterval(this.serverRestartInterval)
    this.serverRestartInterval = setInterval(this.renderServerRestartCountdown.bind(this), 1000)
  }

  onUpdateTeamHealth(data) {
    this.teamStatusMenu.updateMemberHealth(data)
  }

  renderServerRestartCountdown() {
    this.isServerShutdownInProgress = true
    let secondsRemaining = parseInt((this.serverRestartTimestamp - this.timestamp) / Constants.physicsTimeStep)
    if (secondsRemaining <= 0) {
      clearInterval(this.serverRestartInterval)
      secondsRemaining = 0
    }

    let formattedTime = Helper.stringifyTimeShort(secondsRemaining)

    let message = ""

    if (this.shutdownReason) {
      message += this.shutdownReason + " "
    } else {
      message += "Server will restart in "
    }

    message += formattedTime
    document.getElementById("server_announcement_message").innerText = message
  }

  initListeners() {
    window.addEventListener('resize', this.resizeCanvas.bind(this), false)

    let isOnIOS = navigator.userAgent.match(/iPad/i)|| navigator.userAgent.match(/iPhone/i)
    let unloadEvent = isOnIOS ? "pagehide" : "beforeunload"
    window.addEventListener(unloadEvent, this.onBeforeUnload.bind(this), false)

    document.getElementById("manage_team_btn").addEventListener("click", this.onManageTeamBtnClick.bind(this), true)
    document.getElementById("friends_btn").addEventListener("click", this.onFriendsBtnClick.bind(this), true)
    document.getElementById("hangar_controller_cancel_btn").addEventListener("click", this.onHangarControllerCancelBtnClick.bind(this), true)
    document.getElementById("range_toggle_btn").addEventListener("click", this.onRangeViewBtnClick.bind(this), true)
    document.getElementById("restart_btn").addEventListener("click", this.onRestartBtnClick.bind(this), true)
    document.getElementById("chat_input").addEventListener("blur", this.onChatInputBlur.bind(this), true)
    document.getElementById("chat_toggle_btn").addEventListener("click", this.onChatToggleBtnClick.bind(this), true)
    document.getElementById("zoom_in_btn").addEventListener("click", this.onZoomInBtnClick.bind(this), true)
    document.getElementById("zoom_out_btn").addEventListener("click", this.onZoomOutBtnClick.bind(this), true)
    document.getElementById("blueprint_open_btn").addEventListener("click", this.onBlueprintOpenBtnClick.bind(this), true)
    document.getElementById("inventory_open_btn").addEventListener("click", this.onInventoryOpenBtnClick.bind(this), true)
    document.getElementById("map_open_btn").addEventListener("click", this.onMapOpenBtnClick.bind(this), true)
    document.getElementById("visit_colony_hud_btn").addEventListener("click", this.onVisitColonyHudBtnClick.bind(this), true)
    document.getElementById("command_block_hud_btn").addEventListener("click", this.onCommandBlockHudBtnClick.bind(this), true)
    document.getElementById("room_display_toggle_btn").addEventListener("click", this.onRoomDisplayToggleBtnClick.bind(this), true)
    document.getElementById("home_area_display_toggle_btn").addEventListener("click", this.onHomeAreaDisplayToggleBtnClick.bind(this), true)
    document.getElementById("chunk_toggle_btn").addEventListener("click", this.onChunkToggleBtnClick.bind(this), true)
    document.getElementById("tutorial_toggle_btn").addEventListener("click", this.onTutorialOpenBtnClick.bind(this), true)
    document.querySelector(".sector_favorite_btn").addEventListener("click", this.onSectorFavoriteBtnClick.bind(this), true)
    document.querySelector(".upvote_btn").addEventListener("click", this.onSectorUpvoteBtnClick.bind(this), true)
    document.querySelector(".play_again_btn").addEventListener("click", this.onPlayAgainBtnClick.bind(this), true)
    document.querySelector(".exit_minigame_btn").addEventListener("click", this.onExitMinigameBtnClick.bind(this), true)
    document.querySelector(".spectate_btn").addEventListener("click", this.onSpectateBtnClick.bind(this), true)
    document.querySelector("#minigame_invite_container .invite_link_input").addEventListener("click", this.onMiniGameInviteInputClick.bind(this), true)
    document.querySelector("#minigame_invite_container .start_minigame_btn").addEventListener("click", this.onStartMiniGameBtnClick.bind(this), true)

    document.querySelector("#player_quick_inventory").addEventListener("click", this.onQuickInventoryClick.bind(this), true)


    document.querySelector("#hangar_controller_menu").addEventListener("click", (event) => {
      let hangarList = event.target.closest("#hangar_list")
      if (!hangarList) return

      let prevActiveItem = hangarList.querySelector("[data-active='true']")
      if (prevActiveItem) {
        prevActiveItem.dataset.active = false
      }

      let hangarListItem = event.target.closest(".hangar_list_item")
      hangarListItem.dataset.active = true
      let hangarId = hangarListItem.dataset.id

      let hangar = this.sector.hangars[hangarId]

      player.setActiveBuildingContainer(hangar)

    })

  }

  onDockClicked(entity) {
    SocketUtil.emit("DockShip", { shipId: player.ship.id, hangarControllerId: entity.id })
  }

  onRepairBtnClick(e) {
    SocketUtil.emit("Repair", {})
  }

  onManageTeamBtnClick(e) {
    if (this.isInGameMenuOpen()) return
    this.toggleTeamMenu()
  }

  onFriendsBtnClick(e) {
    if (this.isInGameMenuOpen()) return
    this.toggleFriendsMenu()
  }

  selectEntity(entity) {
    this.sector.select(entity)
  }

  resetEntitySelection() {
    this.unselectEntity(this.sector.persistentSelection.selectedEntity)

    if (this.entityMenu.selectedEntity) {
      this.entityMenu.removeSelectedEntity()
      this.entityMenu.close()
    }
  }

  unselectEntity(entity) {
    this.sector.unselect(entity)
  }

  onHangarControllerCancelBtnClick(e) {
    document.querySelector("#hangar_controller_menu").style.display = 'none'
  }

  openHangarController() {
    this.closeAllMenus()

    document.querySelector("#hangar_controller_menu").style.display = 'block'
    document.querySelector("#hangar_list").innerHTML = this.buildHangarListHTML()
  }

  buildHangarListHTML() {
    return Object.keys(this.sector.hangars).map((id) => { return "<div class='hangar_list_item' data-id='" + id + "'> Hangar " + id + "</div>" })
  }

  onRestartBtnClick() {
    if (!this.player) return

    if (this.player.health > 0) {
      this.hideDeathMessage()
    } else {
      SocketUtil.emit("RespawnRequest", { })
    }
  }

  onChatInputBlur(e) {
    if (e.target.id === 'chat_input') return

    this.chatMenu.close()
  }

  toggleMainMenus() {
    if (document.querySelector("#hud_action_container").style.display === "none") {
      this.showGameHuds()
    } else {
      this.hideGameHuds()
    }
  }

  isImposterGame() {
    return this.sector.getOriginalUid() === "eWC1CfZymRExY" ||
           this.sector.getOriginalUid() === "Ap9OYBkw3dQvJ"
  }

  showGameHuds() {
    this.hideMainMenus = false

    if (!this.isMiniGame()) {
      document.querySelector("#player_stats").style.display = "block"
    } else {
      if (this.isImposterGame()) {
        document.querySelector(".total_task_stat").style.display = "block"
      } else {
        document.querySelector(".total_task_stat").style.display = "none"
        document.querySelector("#player_stats").style.display = "block"
      }
    }

    if (this.shouldShowMiniMap()) {
      document.querySelector("#mini_map_menu").style.display = "block"
      document.querySelector("#mini_map_player_pos_label").style.display = "block"
    }

    document.querySelector("#entity_menu").setAttribute('style', 'display: block')

    if (!this.sidebarMenu.isEmpty()) {
      document.querySelector("#sidebar_menu").style.display = 'block'
    }

    if (this.shouldShowTutorial()) {
      document.querySelector("#tutorial_menu").style.display = "block"
    }

    document.querySelector("#player_quick_inventory_menu").style.display = "block"
    document.querySelector("#chat_container").style.display = "block"
    document.querySelector("#team_status_menu").style.display = "block"

    document.querySelector(".resources").style.display = 'block'
    document.querySelector("#hud_action_container").style.display = 'block'
    document.querySelector("#time_label").style.display = 'block'
    document.querySelector("#player_quick_inventory_menu").style.display = 'block'
    document.querySelector(".room_oxygen_stat").style.display = 'block'
    document.querySelector("#status_list_menu").style.display = 'block'
    document.querySelector("#quest_menu").style.display = 'block'

    if (this.shouldShowFavoriteButton()) {
      document.querySelector("#sector_action_menu").style.display = "block"
    }

    if (this.shouldShowLeaderboard()) {
      document.querySelector("#leaderboard_menu").style.display = "block"
    }

    // document.querySelector("#tutorial_toggle_btn").style.display = "block"
  }

  shouldShowLeaderboard() {
    return this.isPvP()
  }

  shouldShowMiniMap() {
    return this.sector.shouldShowMiniMap()
  }

  shouldShowTutorial() {
    if (this.isPvP()) return true
    if (!this.sector) return false
    if (this.sector.isPeaceful()) {
      if (this.sector.uid.match('PnGkJd5xZsb0v')) return true
      return false
    }

    if (this.isTutorial() || this.main.isMobile || !this.isGameCreatedByPlayer()) return false

    return true
  }

  shouldShowQuests() {
    return false
  }

  hideGameHuds() {
    this.hideMainMenus = true
    document.querySelector("#player_stats").style.display = "none"
    document.querySelector(".total_task_stat").style.display = "none"
    document.querySelector("#mini_map_menu").style.display = "none"
    document.querySelector("#mini_map_player_pos_label").style.display = "none"
    document.querySelector("#entity_menu").style.display = "none"
    document.querySelector("#tutorial_menu").style.display = 'none'
    // document.querySelector("#player_quick_inventory_menu").style.display = "none"
    document.querySelector("#chat_container").style.display = "none"
    document.querySelector("#performance_stats").style.display = "none"
    document.querySelector("#team_status_menu").style.display = "none"
    document.querySelector("#sector_action_menu").style.display = "none"
    document.querySelector("#leaderboard_menu").style.display = "none"

    document.querySelector(".resources").style.display = 'none'
    document.querySelector("#hud_action_container").style.display = 'none'
    document.querySelector("#time_label").style.display = 'none'
    document.querySelector("#player_quick_inventory_menu").style.display = 'none'
    document.querySelector(".room_oxygen_stat").style.display = 'none'
    document.querySelector("#status_list_menu").style.display = 'none'
    document.querySelector("#quest_menu").style.display = 'none'
    document.querySelector("#sidebar_menu").style.display = 'none'

    // document.querySelector("#tutorial_toggle_btn").style.display = "none"
  }

  shouldShowFavoriteButton() {
    if (this.isTutorial() || this.isAnonymousGame() || this.isMiniGame()) {
      return false
    }

    return true
  }

  toggleChatMenu() {
    if (this.chatMenu.isOpen()) {
      this.chatMenu.close()
    } else {
      if (this.sector.shouldShowChat()) {
        this.chatMenu.open()
      }
    }
  }

  isInGameMenuOpen() {
    let el = document.querySelector("#welcome_container")
    if (!el) return false
    return el.style.display === 'block'
  }

  onBlueprintOpenBtnClick() {
    if (this.isInGameMenuOpen()) return
    this.blueprintMenu.open()
  }

  onChatToggleBtnClick() {
    this.toggleChatMenu()
  }

  onInventoryOpenBtnClick() {
    if (this.isInGameMenuOpen()) return
    this.toggleInventory()
  }

  onMapOpenBtnClick() {
    if (this.isInGameMenuOpen()) return
    this.toggleMapMenu()
  }

  onVisitColonyHudBtnClick() {
    if (this.isInGameMenuOpen()) return
    this.toggleVisitColonyMenu()
  }

  onCommandBlockHudBtnClick() {
    if (this.isInGameMenuOpen()) return
    this.toggleCommandBlockMenu()
  }

  toggleBlueprintMenu() {
    if (this.sector.settings.isCraftingEnabled) {
      this.blueprintMenu.toggle()
    }
  }

  toggleMapMenu() {
    this.mapMenu.toggle()
  }

  toggleVisitColonyMenu() {
    if (this.isPvP()) return
    if (main.impy) return

    document.querySelector(".search_colony_list").style.display = 'none'
    document.querySelector(".main_colony_list").style.display = 'block'
    
    this.visitColonyMenu.toggle()
  }

  toggleCommandBlockMenu() {
    if (this.isSandbox()) {
      this.commandBlockMenu.toggle()
    }
  }

  toggleFriendsMenu() {
    this.friendsMenu.toggle()
  }

  onRoomDisplayToggleBtnClick() {
    let el = document.getElementById("room_display_toggle_btn")
    el.dataset.toggled = el.dataset.toggled === 'true' ? 'false' : true
    this.isRoomDisplayEnabled = el.dataset.toggled === 'true'
  }

  onSectorFavoriteBtnClick() {
    SocketUtil.emit("SectorAction", { action: "favorite", sectorId: this.sector.uid })
  }

  onSectorUpvoteBtnClick() {
    SocketUtil.emit("SectorAction", { action: "upvote", sectorId: this.sector.uid })
  }

  onPlayAgainBtnClick() {
    if (!this.isMiniGame()) return
    if (this.sector.isPrivate) return

    let uid = this.sector.getOriginalUid()

    // in some cases, we might player to just respawn in same game instance
    // instead of joining a diff one

    this.main.gameExplorer.joinMiniGame(uid, { prevMiniGameId: this.sector.uid })
    this.hideDeathMessage()
  }

  onExitMinigameBtnClick() {
    this.hideDeathMessage()
    this.main.onExitGameMenuBtnClick()
  }

  onSpectateBtnClick() {
    this.hideDeathMessage()
  }

  onStartMiniGameBtnClick(e) {
    SocketUtil.emit("StartRound", { })
  }

  onMiniGameInviteInputClick(e) {
    e.target.select()
    document.execCommand('copy')
  }

  onTutorialOpenBtnClick() {
    if (this.tutorialMenu.isTutorialComplete()) return

    document.querySelector("#tutorial_toggle_btn").style.display = 'none'
    this.tutorialMenu.open()
  }

  onTutorialCloseClick() {
    this.tutorialMenu.onCancelBtnClick()
  }

  toggleTutorial() {
    if (!this.shouldShowTutorial()) return

    if (this.tutorialMenu.isOpen()) {
      this.onTutorialCloseClick()
    } else {
      this.onTutorialOpenBtnClick()
    }
  }

  onChunkToggleBtnClick() {
    let el = document.getElementById("chunk_toggle_btn")
    el.dataset.toggled = el.dataset.toggled === 'true' ? 'false' : true
    this.isChunkDisplayEnabled = el.dataset.toggled === 'true'

    if (!this.isChunkDisplayEnabled && this.visibleChunk) {
      this.visibleChunk.hideDebug()
      this.visibleChunk.hideChunkRegions()
      this.visibleChunk = null
    }

    if (!this.isTracingChunkRegionPath) {
      this.isTracingChunkRegionPath = true
      SocketUtil.emit("Debug", { type: "chunk_region_path" })
    }
  }

  onHomeAreaDisplayToggleBtnClick() {
    let el = document.getElementById("home_area_display_toggle_btn")
    if (el.dataset.toggled === 'true') {
      el.dataset.toggled = 'false'
      this.sector.homeArea.sprite.alpha = 0
    } else {
      el.dataset.toggled = 'true'
      this.sector.homeArea.sprite.alpha = 1
    }
  }

  showChunkRegionPathForEntity(entity) {
    SocketUtil.emit("RequestEntityChunkRegionPath", { entityId: entity.getId() })

    this.shownChunkRegionPaths.forEach((chunkRegionPath) => {
      chunkRegionPath.hide()
    })

    setTimeout(() => {
      // wait until its received from server
      this.shownChunkRegionPaths = this.sector.getChunkRegionPathsFromEntityId(entity.getId())
      this.shownChunkRegionPaths.forEach((chunkRegionPath) => {
        chunkRegionPath.show()
      })
    }, 1000)
  }

  showChunk(clientX, clientY) {
    const cameraPositionX = -this.cameraDisplacement.x
    const cameraPositionY = -this.cameraDisplacement.y
    const x = (cameraPositionX + clientX) / this.resolution
    const y = (cameraPositionY + clientY) / this.resolution

    const row = Math.floor(y / Constants.tileSize)
    const col = Math.floor(x / Constants.tileSize)

    const chunkRow = Math.floor(row / Constants.chunkRowCount)
    const chunkCol = Math.floor(col / Constants.chunkColCount)

    let chunk = this.sector.getChunk(chunkRow, chunkCol)
    let chunkRegion

    if (chunk) {
      chunkRegion = chunk.getChunkRegion(row, col)
    }

    if (this.visibleChunk !== chunk) {
      let prevShownChunk = this.visibleChunk
      this.visibleChunk = chunk
      this.onShownChunkChanged(prevShownChunk, chunk, row, col)
    }

    if (this.visibleChunkRegion !== chunkRegion) {
      let prevShownChunkRegion = this.visibleChunkRegion
      this.visibleChunkRegion = chunkRegion
      this.onShownChunkRegionChanged(prevShownChunkRegion, chunkRegion, row, col)
    }

  }

  onShownChunkRegionChanged(prevShownChunkRegion, chunkRegion, row, col) {
    if (prevShownChunkRegion) {
      prevShownChunkRegion.unfocus()
    }

    if (chunkRegion) {
      chunkRegion.focus()
    }
  }

  onShownChunkChanged(prevShownChunk, chunk, row, col) {
    if (prevShownChunk) {
      prevShownChunk.hideDebug()
      prevShownChunk.hideChunkRegions()
    }

    if (chunk) {
      chunk.showDebug()
      chunk.showChunkRegions(row, col)
    }
  }

  onRangeViewBtnClick(e) {
    if (this.player.ship) {
      this.player.ship.toggleRangeLayer()
    }
  }

  toggleTeamMenu() {
    this.teamMenu.toggle()
  }

  displayError(msg, options = {}) {
    msg = i18n.t(msg)

    if (!this.errorFadeOutTween) {
      this.errorFadeInTween = ClientHelper.getFadeTween(this.errorContent.parentElement, 0, 1, 0)
      this.errorFadeInTween.start()
    } else {

    }

    this.errorContent.parentElement.style.display = 'block'

    let textContent
    if (options.isTitle) {
      textContent = this.errorTitle
    } else {
      textContent = this.errorContent
    }

    textContent.innerText = msg
    textContent.className = ""

    if (options.isTitle) {
      if (options.color) {
        textContent.style.color = options.color
      } else {
        textContent.style.color = "yellow"
      }
    }

    if (options.size) {
      textContent.style.fontSize = options.size + "px"
    } else {
      if (options.isTitle) {
        textContent.style.fontSize = "60px"
      } else {
        textContent.style.fontSize = "30px"
      }
    }

    if (options.warning) {
      textContent.classList.add("warning")
    }

    if (options.success) {
      textContent.classList.add("success")
    }

    if (options.transparent) {
      textContent.classList.add("transparent")
    }

    if (this.errorFadeOutTween) {
      // reset it
      this.errorFadeOutTween.stop()
    }

    this.errorFadeOutTween = ClientHelper.getFadeTween(this.errorContent.parentElement, 1, 0, 5000)
    this.errorFadeOutTween.start()
    this.errorFadeOutTween.onStop(() => {
      this.errorFadeOutTween = null
    })

    this.errorFadeOutTween.onComplete(() => {
      this.errorFadeOutTween = null
      this.errorContent.innerText = ""
      this.errorTitle.innerText = ""
    })
  }

  isPvP() {
    if (!this.sector) return false
    return this.sector.isPvP()
  }

  isSandbox() {
    return this.isPeaceful()
  }

  isPeaceful() {
    if (!this.sector) return false
    return this.sector.isPeaceful()
  }

  isHardcore() {
    if (!this.sector) return false
    return this.sector.isHardcore()
  }

  async submitGameRequest(username, options = {}) {
    let data = {
      username: username,
      screenWidth: this.getScreenWidth(),
      screenHeight: this.getScreenHeight(),
      sessionId: this.main.sessionId,
      locale: window.language,
      fingerprint: this.main.fingerprint
    }

    if (options.sectorId) data["sectorId"] = options.sectorId
    if (options.isNewTeam) data["isNewTeam"] = true

    const url = this.main.getBrowserHref()
    const isTroubleshooter = url.match(new RegExp(".*?stress=(.*)"))
    if (isTroubleshooter) data["isTroubleshooter"] = true

    if (this.main.user) {
      let idToken = await this.main.getFirebaseIdToken()
      if (idToken) {
        data["idToken"] = idToken
        data["username"] = this.main.username
        data["uid"] = this.main.uid
      }

      SocketUtil.emit("RequestGame", data)
    } else {
      SocketUtil.emit("RequestGame", data)
    }
  }

  requestGame(options = {}) {
    this.requestGameTime = (new Date()).getTime()

    document.getElementById("home_error_message").innerText = ""
    const username = document.getElementById("name_input").value

    this.submitGameRequest(username, options)
  }

  resumeGame() {
    if (!this.sector) return
    this.requestGameTime = (new Date()).getTime()

    let data = {
      sessionId: this.main.sessionId,
      screenWidth: this.getScreenWidth(),
      screenHeight: this.getScreenHeight(),
      sectorId: this.sector.uid,
      locale: window.language
    }

    if (this.main.idToken) {
      data.idToken = this.main.idToken
      data.uid = this.main.uid
    }

    SocketUtil.emit("ResumeGame", data)
  }

  toggleInventory() {
    this.inventoryMenu.toggle()
  }


  onQuickInventoryClick(event) {
    const inventorySlot = event.target.closest(".inventory_slot")
    if (!inventorySlot) return

    if (inventorySlot.className.indexOf("ellipsis") > 0) {
      this.toggleInventory()
    } else {
      const index = inventorySlot.dataset.index
      SocketUtil.emit("ChangeEquip", { index: index })
    }
  }

  sellBuilding(building) {
    SocketUtil.emit("Sell", { type: building.getUpgradeType(), id: building.id })
    this.closeEntityMenu()
  }

  autoAdjustResolution() {
    if (!this.sector) return
    if (!this.player) return

    if (this.sector.isZoomAllowed()) return

    const nativeResolution = {
      width: 1280,
      height: 768
    }

    const deviceWidth = this.getCanvasWidth()
    const deviceHeight = this.getCanvasHeight()

    let scaleFactor = deviceWidth / nativeResolution.width
    let minScale = this.isMobile() ? 0.8 : 1
    scaleFactor = Math.max(minScale, scaleFactor)
    scaleFactor = Math.min(1.2, scaleFactor)

    clearTimeout(this.updateCanvasResolutionTimeout)
    this.updateCanvasResolutionTimeout = setTimeout(() => {
      this.resolution = scaleFactor
      this.updateCanvasResolution()
      this.onResolutionChanged()
    }, 500)
  }

  onResolutionChanged() {
    this.centerCameraToCameraFocusTarget()
  }

  centerCameraToCameraFocusTarget() {
    if (!this.player) return

    let cameraFocusTarget = this.player.getCameraFocusTarget()
    if (cameraFocusTarget.isPositionBased) {
      this.centerCameraToXY(cameraFocusTarget.x, cameraFocusTarget.y)
    } else {
      this.centerCameraTo(cameraFocusTarget)
    }
  }


  updateCanvasResolution() {
    this.gameLayer.scale.set(this.resolution)

    let browserResolution = this.getPixelRatio()
    let canvasWidth  = this.getCanvasWidth() * browserResolution
    let canvasHeight = this.getCanvasHeight() * browserResolution

    this.app.renderer.view.style.width  = this.getCanvasWidth()  + 'px'
    this.app.renderer.view.style.height = this.getCanvasHeight() + 'px'

    this.app.renderer.resize(canvasWidth, canvasHeight)
  }

  getPixelRatio() {
    return Math.min(1, window.devicePixelRatio)
  }

  resizeCanvas(options = {}) {
    if (this.hudAlertContainer) {
      this.hudAlertContainer.width = window.innerWidth
      this.hudAlertContainer.height = window.innerHeight
    }

    let browserResolution = this.getPixelRatio()
    let canvasWidth  = this.getCanvasWidth() * browserResolution
    let canvasHeight = this.getCanvasHeight() * browserResolution

    this.app.renderer.resize(canvasWidth, canvasHeight)
    this.app.renderer.view.style.width  = this.getCanvasWidth()  + 'px'
    this.app.renderer.view.style.height = this.getCanvasHeight() + 'px'
    this.autoAdjustResolution()

    // center player only after dimensions/resolution have changed
    if (this.player) {
      this.centerCameraToCameraFocusTarget()
      this.player.cullChunks()

      if (this.player.hangar) {
        this.sector.hangarFadeBlackSprite.width = this.getCanvasWidth()
        this.sector.hangarFadeBlackSprite.height = this.getCanvasHeight()
      }
    }

    this.updateServerUpdateRate(this.getScreenWidth(), this.getScreenHeight())

    SocketUtil.emit('WindowResized', { screenWidth: this.getScreenWidth(), screenHeight: this.getScreenHeight(), isZoom: options.zoom })
  }

  getScreenWidth() {
    return this.getCanvasWidth() / this.resolution
  }

  getScreenHeight() {
    return this.getCanvasHeight() / this.resolution
  }

  updateServerUpdateRate(screenWidth, screenHeight) {
    this.server_update_rate = this.getServerUpdateRate(screenWidth)
    this.latencyCalculateIntervalInSeconds = 2
    this.maxUpstreamIntervals = []
  }

  getServerUpdateRate(screenWidth, screenHeight) {
    const multiplier = this.getServerUpdateRateMultiplier(screenWidth, screenHeight)
    return Constants.physicsTimeStep / multiplier
  }

  getServerUpdateRateMultiplier(screenWidth, screenHeight) {
    if (screenWidth > 4000) {
      return 4
    } else if (screenWidth > 3000) {
      return 3
    } else if (screenWidth > 2000) {
      return 2
    } else {
      return 1
    }
  }

  onSyncWithServer(data) {
    this.timestamp = data.timestamp

    this.markPacketTick()
    this.recordUpstreamRate()
    this.renderTickDuration(data)
    this.renderMemory(data)

    if (this.sector) {
      this.sector.syncWithServer(data)
    }

    if (this.player) {
      this.renderPlayerCamera(data)
    }

    if (this.sector) {
      this.renderHour(data)
      this.renderDay(data)
    }
  }

  onUpdateStats(data) {
    if (!this.player) return

    let stats = ["gold", "oxygen", "stamina", "hunger", "thirst"]

    stats.forEach((stat) => {
      if (data.hasOwnProperty(stat)) {
        let setter = "set" + Helper.capitalize(stat)
        let value  = data[stat]

        if (data.entityId) {
          let entity = this.sector.getEntity(data.entityId)
          if (entity && entity[setter]) {
            entity[setter](value)
          }
        } else {
          this.player[setter](value)
        }
      }
    })

    if (data.hasOwnProperty("taskCompleted")) {
      this.updateTotalTasksBar(data.taskCompleted, data.totalTasks)
    }

    if (data.hasOwnProperty("colorIndex")) {
      this.colorPickerMenu.setColorIndex(data.colorIndex)
    }

    if (data.hasOwnProperty("textureIndex")) {
      this.colorPickerMenu.setTextureIndex(data.textureIndex)
    }
  }

  onBreakBuilding(data) {
    let building = this.sector.buildings[data.id]
    if (building) {
      building.break(data.progress)
    }
  }

  onDebugRange(data) {
    this.sector.drawRange(data.box)
  }

  onProgressCircle(data) {
    if (data.completeTimestamp) {
      this.sector.startProgressCircle(data.completeTimestamp)
    } else if (data.clientMustDelete) {
      this.sector.hideProgressCircle()
    }

  }

  onAnimate(data) {
    if (!this.sector) return
    let entity = this.sector.getEntity(data.entityId)
    if (entity) {
      if (data.animation) {
        if (data.animation === "heart") {
          entity.animateHeart()
        }
      } else if (data.shouldStop) {
        entity.stopEquipmentAnimation()
      } else if (typeof entity.animateEquipment === 'function') {
        entity.animateEquipment()
      }
    }
  }

  markPacketTick() {
    this.ticksSincePacket = 0
  }

  recordUpstreamRate() {
    if (this.firstServerMessage) {
      this.firstServerMessage = false
      return
    }

    let time = Date.now()
    if (this.lastUpstreamTime) {
      let upstreamInterval = time - this.lastUpstreamTime
      this.upstreamIntervals.push(upstreamInterval)
      if (this.upstreamIntervals.length >= (this.server_update_rate)) {
        window.upstream_debug = this.upstreamIntervals.slice()
        this.upstreamIntervals.sort((a, b) => { return a - b })
        let min = this.upstreamIntervals[0]
        let max = this.upstreamIntervals[this.upstreamIntervals.length - 1]
        let avg = Math.floor(this.upstreamIntervals.reduce((sum, val) => { return sum + val }) / this.upstreamIntervals.length)
        let upstreamEl = document.querySelector("#performance_stats #upstream .value")
        if (upstreamEl) {
          upstreamEl.innerText = avg + " ms"
        }

        this.upstreamIntervals = []
        this.maxUpstreamInterval = max

        if (!this.firstTenSecondsMaxUpstreamInterval) {
          // initial value
          let multiplier = this.getServerUpdateRateMultiplier(this.getScreenWidth())
          this.firstTenSecondsMaxUpstreamInterval = 200 // assume bad network in first 10 sec
        }

        this.maxUpstreamIntervals.push(this.maxUpstreamInterval)
        if (this.maxUpstreamIntervals.length >= this.latencyCalculateIntervalInSeconds) {
          this.calculateLatency()
          this.latencyCalculateIntervalInSeconds = 10 // set it back to orig
        }
      }
    }
    this.lastUpstreamTime = time
  }

  calculateLatency() {
    // every 10 sec
    let avg = Math.floor(this.maxUpstreamIntervals.reduce((sum, val) => { return sum + val }) / this.maxUpstreamIntervals.length)
    let multiplier = this.getServerUpdateRateMultiplier(this.getScreenWidth())
    this.firstTenSecondsMaxUpstreamInterval = avg

    // console.log("upsteam : " + this.firstTenSecondsMaxUpstreamInterval)
    this.maxUpstreamIntervals = []
  }


  toggleAdminMode() {
    this.chatMenu.chatInput.value = "/admin"
    this.chatMenu.submit()
  }

  renderTickDuration(data) {
    if (!data.hasOwnProperty("tick")) return
    document.querySelector("#performance_stats #tick .value").innerText = data.tick + " ms"
  }

  renderMemory(data) {
    if (!data.hasOwnProperty("memory")) return
    document.querySelector("#performance_stats #server_memory .value").innerText = data.memory + " MB"
  }

  renderHour(data) {
    if (!data.hasOwnProperty("hour")) return

    if (this.hour !== data.hour) {
      this.hour = data.hour
      this.onHourChanged()
    }
  }

  renderDay(data) {
    if (!data.hasOwnProperty("day")) return

    if (this.day !== data.day) {
      this.day = data.day
      this.onDayChanged()
    }
  }

  onDayChanged() {
    document.querySelector("#day_label").innerText = this.day + ""

    if (this.isLoggedIn() && this.isCreatedByPlayer()) {
      this.updateScreenshot()
    }
  }

  updateScreenshot() {
    // wait for at least few seconds game load before screenshot
    if (Date.now() - this.sector.initialLoadTime < 5000) return

    if (this.sector.getScreenshotCount() === 0) {
      this.screenshot(Constants.autoscreenshotPosition)
      return
    }

    if (this.sector.getScreenshotCount() === 1) {
      let screenshotKey = Object.keys(this.sector.screenshots)[0]
      let screenshotPosition = this.sector.screenshots[screenshotKey]

      if (screenshotPosition === Constants.autoscreenshotPosition &&
          (!this.lastScreenshotDay || this.day - this.lastScreenshotDay >= 5)) {
        SocketUtil.emit("RemoveScreenshot", { id: screenshotKey })
        this.screenshot(Constants.autoscreenshotPosition)
      }
    }
  }

  onHourChanged() {
    document.querySelector("#hour_label").innerText = this.hour

    const isNight = this.hour < 6 || this.hour >= 18

    if (this.isNight !== isNight) {
      this.isNight = isNight
      this.onDayNightChanged()
    }

    this.sector.lightManager.setDarkness(this.hour)
  }

  onDayNightChanged() {
  }

  renderPlayerCamera(data) {
    this.player.setCamera(data.camera)
  }

  isModalMenuOpen() {
    return this.openMenus.filter((menu) => {
      return menu.isModal()
    }).length > 0
  }

  onMenuInteract(cmd) {
    this.openMenus.forEach((menu) => {
      menu.onMenuInteract(cmd)
    })
  }

  renderActiveEquip(index) {
    const quickInventoryIndex = index

    const activeInventorySlot = document.querySelector("#player_quick_inventory .player_inventory_slot.active")
    if (activeInventorySlot) {
      activeInventorySlot.className = "player_inventory_slot inventory_slot"
    }

    let inventorySlot = document.querySelector("#player_quick_inventory .player_inventory_slot[data-index='" + quickInventoryIndex + "']")
    if (inventorySlot) {
      inventorySlot.className = "player_inventory_slot inventory_slot active"

      if (this.isMobile()) {
        let imageSrc = inventorySlot.querySelector("img").getAttribute('src')
        let itemCount = inventorySlot.dataset.content
        this.mobilePrimaryActionBtn.querySelector("img").src = imageSrc
        this.mobilePrimaryActionBtn.dataset.content = itemCount
        this.mobilePrimaryActionBtn.dataset.id = inventorySlot.dataset.id
        this.mobilePrimaryActionBtn.dataset.type = inventorySlot.dataset.type

        let equipmentKlass = Equipments.forType(inventorySlot.dataset.type)
        if (!equipmentKlass) {
          this.removeItemUsageFor(this.mobilePrimaryActionBtn)
          return
        }
        if (equipmentKlass.prototype.isUnbreakable() && !equipmentKlass.prototype.shouldShowUsage()) {
          this.removeItemUsageFor(this.mobilePrimaryActionBtn)
          return
        }

        if (inventorySlot.dataset.usage) {
          let usage = parseInt(inventorySlot.dataset.usage)
          let maxUsage = equipmentKlass.prototype.getUsageCapacity()
          this.renderItemUsageFor(this.mobilePrimaryActionBtn, usage, maxUsage)
        } else {
          this.removeItemUsageFor(this.mobilePrimaryActionBtn)
        }
      }
    }
  }

  isContentFillable(inventoryType) {
    const fillables = [Protocol.definition().BuildingType.Syringe,
                       Protocol.definition().BuildingType.Bottle]

    return fillables.indexOf(inventoryType) !== -1
  }

  getImageSrcForItemType(type) {
    let imgSrc

    imgSrc = "/assets/images/" + Item.getSpritePath(type)

    return imgSrc
  }

  createHoldItemInventorySlot() {
    const div = document.createElement("div")
    div.className = "inventory_slot hold_item_slot"

    const img = document.createElement("img")
    div.appendChild(img)

    document.body.appendChild(div)

    return div
  }

  deleteHoldItemInventorySlot() {
    if (this.holdItemInventorySlot) {
      if (this.holdItemInventorySlot.parentElement) {
        this.holdItemInventorySlot.parentElement.removeChild(this.holdItemInventorySlot)
      }
      this.holdItemInventorySlot = null
    }

    this.isHoldItemDeletedRecently = true
  }

  cleanInventoryCooldowns() {
    for (let index in this.inventoryCooldowns) {
      let inventorySlot = document.querySelector(".player_inventory_slot[data-index='" + index + "']")
      if (inventorySlot) {
        if (inventorySlot.querySelector(".cooldown_overlay")) {
          inventorySlot.querySelector(".cooldown_overlay").innerText = ""
          inventorySlot.querySelector(".cooldown_overlay").style.display = "none"
        }
      }
      clearInterval(this.inventoryCooldowns[index])
      delete this.inventoryCooldowns[index]
    }
  }

  createCooldownRenderInterval(inventorySlot, data, cooldownSeconds) {
    return setInterval(() => {
      if (this.player.mountedId || this.voteMenu.isOpen()) {
        return
      }
      let seconds = Math.floor((this.timestamp - data.lastUsedTimestamp) / Constants.physicsTimeStep)
      let remaining = cooldownSeconds - seconds
      if (remaining > 0) {
        if (inventorySlot.querySelector(".cooldown_overlay")) {
          inventorySlot.querySelector(".cooldown_overlay").innerText = remaining
          inventorySlot.querySelector(".cooldown_overlay").style.display = 'block'
        }
      } else {
        if (inventorySlot.querySelector(".cooldown_overlay")) {
          inventorySlot.querySelector(".cooldown_overlay").style.display = 'none'
        }
        clearInterval(this.inventoryCooldowns[data.index])
        delete this.inventoryCooldowns[data.index]
      }
    }, 1000)
  }

  renderInventoryCooldown(inventorySlot, data) {
    let klass = Item.getKlass(data.type)
    if (!klass.prototype.shouldShowCooldown()) return

    let cooldownSeconds = Math.floor(klass.prototype.getStats().reload / 1000)
    let seconds = Math.floor((this.timestamp - data.lastUsedTimestamp) / Constants.physicsTimeStep)
    if (seconds < cooldownSeconds) {
      if (this.inventoryCooldowns[data.index]) {
        clearInterval(this.inventoryCooldowns[data.index])
      }

      this.inventoryCooldowns[data.index] = this.createCooldownRenderInterval(inventorySlot, data, cooldownSeconds)
    }
  }

  renderInventorySlot(inventorySlot, data) {
    inventorySlot.querySelector("img").src = this.getImageSrcForItemType(data.type)
    if (data.id) {
      inventorySlot.dataset.id    = data.id
    }
    inventorySlot.dataset.type  = data.type

    inventorySlot.dataset.content = data.count === 1 ? "" : data.count
    inventorySlot.dataset.special = data.instance ? data.instance.content : ""

    // show item count in primary action btn
    if (this.isMobile() && inventorySlot.dataset.id === this.mobilePrimaryActionBtn.dataset.id) {
      this.mobilePrimaryActionBtn.dataset.content = data.count === 1 ? "" : data.count
    }

    if (data.lastUsedTimestamp) {
      this.renderInventoryCooldown(inventorySlot, data)
    }

    if (data.instance) {
      inventorySlot.dataset.usage = data.instance.usage
      this.renderInventorySlotUsage(inventorySlot, data.instance.usage)
    } else {
      inventorySlot.dataset.usage = ""
      this.removeInventorySlotUsage(inventorySlot)
    }
  }

  resetInventorySlot(inventorySlot) {
    inventorySlot.querySelector("img").src = ""
    inventorySlot.dataset.id = ""
    inventorySlot.dataset.type = ""
    inventorySlot.dataset.content = ""

    this.removeInventorySlotUsage(inventorySlot)
  }

  resetMobilePrimaryActionBtn(inventorySlot) {
    if (inventorySlot.dataset.id === this.mobilePrimaryActionBtn.dataset.id) {
      this.mobilePrimaryActionBtn.querySelector("img").src = ""
      this.mobilePrimaryActionBtn.dataset.content = ""
      this.mobilePrimaryActionBtn.dataset.id = ""
      this.mobilePrimaryActionBtn.dataset.type = ""

      this.removeItemUsageFor(this.mobilePrimaryActionBtn)
    }
  }


  renderInventorySlotUsage(inventorySlot, usage) {
    let equipmentKlass = Equipments.forType(inventorySlot.dataset.type)
    if (!equipmentKlass) return
    if (equipmentKlass.prototype.isUnbreakable() && !equipmentKlass.prototype.shouldShowUsage()) return

    let maxUsage = equipmentKlass.prototype.getUsageCapacity()

    this.renderItemUsageFor(inventorySlot, usage, maxUsage)

    if (this.isMobile() && inventorySlot.dataset.id === this.mobilePrimaryActionBtn.dataset.id) {
      this.renderItemUsageFor(this.mobilePrimaryActionBtn, usage, maxUsage)
    }
  }

  renderItemUsageFor(el, usage, max) {
    el.dataset.usage = usage
    let usageBar = el.querySelector(".usage_bar")
    if (!usageBar) {
      usageBar = this.createUsageBar()
      el.appendChild(usageBar)
    }

    let curr = usage
    usageBar.querySelector(".bar_fill").style.width = (curr/max * 100) + "%"
  }

  removeInventorySlotUsage(inventorySlot) {
    this.removeItemUsageFor(inventorySlot)

    if (this.isMobile() && inventorySlot.dataset.id === this.mobilePrimaryActionBtn.dataset.id) {
      this.removeItemUsageFor(this.mobilePrimaryActionBtn)
    }
  }

  removeItemUsageFor(el) {
    let usageBar = el.querySelector(".usage_bar")
    if (usageBar && usageBar.parentElement) {
      usageBar.parentElement.removeChild(usageBar)
    }
  }

  createUsageBar() {
    let usageBar = document.createElement("div")
    usageBar.className = "usage_bar"

    let barFill = document.createElement("div")
    barFill.className = "bar_fill"
    usageBar.appendChild(barFill)

    return usageBar
  }

  createEntity(group, data) {
    let entity

    switch(group) {
      case "terrains":
        data.x = data.col * Constants.tileSize + Constants.tileSize/2
        data.y = data.row * Constants.tileSize + Constants.tileSize/2
        entity = Terrains.forType(data.type).build(this, data)
        break
      case "ships":
        entity = new Ship(this, data)
        break
      case "paths":
        entity = new Path(this, data)
        break
      case "chunkRegions":
        entity = new ChunkRegion(data, this.sector)
        break
      case "chunkRegionPaths":
        entity = new ChunkRegionPath(data, this.sector)
        break
      case "rooms":
        entity = new Room(data, this.sector)
        break
      case "players":
        entity = new Player(data, this.sector)
        break
      case "regions":
        entity = new Region(this, data)
        break
      case "buttons":
        entity = new Button(this, data)
        break
      case "pickups":
        entity = new Pickup(this, data)
        break
      case "corpses":
        entity = new Corpse(this, data)
        break
      case "mobs":
        entity = Mobs.forType(data.type).build(this, data)
        break
      case "projectiles":
        entity = Projectiles.forType(data.type).create(this, data)
        break
      case "buildings":
        entity = Buildings.forType(data.type).build(this, data)
        break
      case "transports":
        entity = Transports.forType(data.type).build(this, data)
        break
      default:
        throw new Error("Invalid group for createEntity: " + group)
    }

    return entity
  }

  measureInitialJoinTime() {
    if (this.initialJoinMeasured) return
    this.initialJoinMeasured = true

    const elapsed = (this.joinedGameTime - this.requestGameTime) / 1000
    console.log("initial join time: " + elapsed + " seconds")
  }

  onShowStarMap(data) {
  }

  onTeleport(data) {
    let oldResolution = this.resolution

    this.removeDataFromPreviousGame({
      menuExclude: [this.teamMenu, this.teamStatusMenu, this.chatMenu],
      excludeTeamInit: true
    })

    this.resolution = oldResolution
    this.gameLayer.scale.set(this.resolution)

    this.playerId = data.playerId
    this.initSector(data.sector)
    this.sector.initPlayers(data)
    this.sector.setSettings(data.sector.settings)

    this.renderInventory(data)
    this.onEquipIndexChanged(data)

    this.mapMenu.reinit()
  }

  renderCommon() {
    if (this.isMiniGame()) {
      document.querySelector("#hud_action_container").classList.add("minigame")
      document.querySelector("#time_label").style.display = 'none'

      if (this.isImposterGame()) {
        document.querySelector("#player_stats").style.display = 'none'
        document.querySelector(".total_task_stat").style.display = 'block'
      } else {
        document.querySelector("#player_stats").style.display = 'block'
        document.querySelector(".total_task_stat").style.display = 'none'
      }
    } else {
      document.querySelector("#hud_action_container").classList.remove("minigame")
      document.querySelector("#time_label").style.display = 'block'
      document.querySelector("#player_stats").style.display = 'block'
      document.querySelector(".total_task_stat").style.display = 'none'
    }

    if (this.shouldShowTutorial()) {
      this.tutorialMenu.open()
    } else {
      this.tutorialMenu.close()
    }

    if (this.shouldShowFavoriteButton()) {
      document.querySelector("#sector_action_menu").style.display = 'none'
    } else {
      document.querySelector("#sector_action_menu").style.display = 'block'
    }

    if (this.shouldShowFavoriteButton()) {
      document.querySelector("#sector_action_menu").style.display = "block"
    } else {
      document.querySelector("#sector_action_menu").style.display = "none"
    }

    if (this.shouldShowLeaderboard()) {
      this.leaderboardMenu.open()
    } else {
      this.leaderboardMenu.close()
    }

    if (this.isMiniGameEditor()) {
      document.querySelector(".minigame_controls_container").style.display = 'block'
      let link = main.getBrowserHref() + "minigame=" + "minigame-" + this.sector.uid
      document.querySelector(".launch_minigame_btn").href = link
    } else {
      document.querySelector(".minigame_controls_container").style.display = 'none'
    }
  }

  isMiniGameEditor() {
    let sectors = ["uLHpXWb2koXYe", "l8v7ezWMvnGeC", "eWC1CfZymRExY", "Ap9OYBkw3dQvJ", "YcdqgbswlAqRi"]
    return sectors.indexOf(this.sector.uid) !== -1
  }

  initGameModeUI() {
    if (this.isPvP()) {
      this.renderPvPMode()
    } else {
      this.renderDefault()
    }

    if (this.isSandbox()) {
      document.querySelector("#command_block_hud_btn").style.display = 'block'
    } else {
      document.querySelector("#command_block_hud_btn").style.display = 'none'
    }

    this.renderCommon()

    if (this.main.isMobile) {
      this.renderMobileUI()
    }

  }

  renderTutorial() {
  }

  renderMobileUI() {
  }

  renderDefault() {
    document.querySelector("#base_hud").classList.remove("pvp")
  }

  renderPvPMode() {
    document.querySelector("#alliance_btn").style.display = 'none'
    document.querySelector("#visit_colony_hud_btn").style.display = 'none'
    document.querySelector("#base_hud").classList.add("pvp")
  }

  onEnterSector(data) {
    this.showPlayerJoinGameMessage(data.player.name)
    this.sector.syncWithServerForGroups(["players"], { players: [data.player] })
  }

  onLeaveSector(data) {
    let player = this.sector.players[data.player.id]
    if (player) {
      player.remove()
    }
  }

  onPlayerCantJoin(data) {
    this.main.onPlayerCantJoin(data)
  }

  onPlayerRespawn(data) {
    this.hideDeathMessage()

    this.player.onStaminaChanged()
  }

  getSectorName() {
    return this.sector.name
  }

  playBackgroundMusic() {
    if (this.isPvP()) return
    let musicName =  this.getPeacefulMusicName()
    this.backgroundMusicSoundId = this.playSoundLazyDownload(musicName, { loop: true })
  }

  stopBackgroundMusic() {
    if (this.isPvP()) return
    this.stopSound(this.getPeacefulMusicName())
  }

  getPeacefulMusicName() {
    if (this.sector.getOriginalUid() === "Ap9OYBkw3dQvJ") {
      return "anotherplanet"
    } else if (this.sector.getOriginalUid() === "vbj91eofmFCiu") {
      return "td"  
    } else {
      return "peaceful"
    }
  }

  stopAllBackgroundMusic() {
    if (this.isPvP()) return
    this.stopSound("peaceful")
    this.stopSound("enemy_invasion")
    this.stopSound("meeting")
    this.stopSound("anotherplanet")
  }

  playMeetingMusic() {
    try {
      let backgroundSound = this.sounds[this.getPeacefulMusicName()]
      if (backgroundSound.playing()) {
        backgroundSound.once('fade', () => { backgroundSound.stop( this.backgroundMusicSoundId ); }, this.backgroundMusicSoundId)
        backgroundSound.fade(this.getSavedOrDefaultBackgroundVolume(), 0, 3000, this.backgroundMusicSoundId)
      }

      this.meetingMusicSoundId = this.playSound("meeting", { loop: true })
      this.sounds["meeting"].fade(0, this.getSavedOrDefaultBackgroundVolume(), 3000, this.meetingMusicSoundId)
    } catch(e) {
      console.error(e)
    }
  }

  stopMeetingMusic() {
    try {
      let meetingSound = this.sounds["meeting"]
      if (meetingSound.playing()) {
        meetingSound.once('fade', () => { meetingSound.stop( this.meetingMusicSoundId ); }, this.meetingMusicSoundId)
        meetingSound.fade(this.getSavedOrDefaultBackgroundVolume(), 0, 3000, this.meetingMusicSoundId)
      }

      this.backgroundMusicSoundId = this.playSound(this.getPeacefulMusicName(), { loop: true })
      this.sounds[this.getPeacefulMusicName()].fade(0, this.getSavedOrDefaultBackgroundVolume(), 3000, this.backgroundMusicSoundId)
    } catch(e) {
      console.error(e)
    }
  }

  playRaidMusic() {
    if (this.isPvP()) return
    try {
      let backgroundSound = this.sounds[this.getPeacefulMusicName()]
      if (backgroundSound.playing()) {
        backgroundSound.once('fade', () => { backgroundSound.stop( this.backgroundMusicSoundId ); }, this.backgroundMusicSoundId)
        backgroundSound.fade(this.getSavedOrDefaultBackgroundVolume(), 0, 3000, this.backgroundMusicSoundId)
      }

      this.raidMusicSoundId = this.playSound("enemy_invasion", { loop: true })
      this.sounds["enemy_invasion"].fade(0, this.getSavedOrDefaultBackgroundVolume(), 3000, this.raidMusicSoundId)
    } catch(e) {
      console.error(e)
    }
  }

  startAlarm() {
    this.startHudAlertTween()
  }

  stopAlarm() {
    this.stopHudAlertTween()
    let el = document.querySelector(".event_item#alarm_event")
    if (el) {
      if (el.parentElement) {
        el.parentElement.removeChild(el)
      }
    }

    clearInterval(this.eventCountdownIntervals[i18n.t("Events.Alarm")])
  }

  startFixLights() {
  }

  stopFixLights() {
    let el = document.querySelector(".event_item#fix_lights_event")
    if (el) {
      if (el.parentElement) {
        el.parentElement.removeChild(el)
      }
    }

    clearInterval(this.eventCountdownIntervals[i18n.t("Events.FixLights")])
  }

  stopRaidMusic() {
    if (this.isPvP()) return
    try {
      let raidSound = this.sounds["enemy_invasion"]
      if (raidSound.playing()) {
        raidSound.once('fade', () => { raidSound.stop( this.raidMusicSoundId ); }, this.raidMusicSoundId)
        raidSound.fade(this.getSavedOrDefaultBackgroundVolume(), 0, 3000, this.raidMusicSoundId)
      }

      this.backgroundMusicSoundId = this.playSound(this.getPeacefulMusicName(), { loop: true })
      this.sounds[this.getPeacefulMusicName()].fade(0, this.getSavedOrDefaultBackgroundVolume(), 3000, this.backgroundMusicSoundId)
    } catch(e) {
      console.error(e)
    }
  }

  isCreatedByPlayer() {
    return this.playerUid === this.creatorUid
  }

  isAnonymousGame() {
    if (!this.creatorUid) return true

    let uuidv4Regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)
    return uuidv4Regex.test(this.creatorUid)
  }

  onEndGame(data) {
    if (data.isCountdown) {
      this.hideDeathMessage()
    } else if (this.sector.isPrivate) {
      let uid = this.sector.getOriginalUid()
      this.main.gameExplorer.joinMiniGame(uid, { targetMiniGameId: this.sector.uid, isPrivate: true })
      this.hideDeathMessage()
    } else {
      this.onPlayAgainBtnClick()
    }

  }

  onJoinGame(data) {
    document.body.style.overflow = 'hidden'
    this.joinGameTime = Date.now()

    this.isActive = true
    this.playerUid = data.playerUid
    this.creatorUid = data.creatorUid
    this.host = data.host
    this.pid = data.pid
    this.version = data.version
    this.revision = data.revision
    this._isMiniGame = data.isMiniGame

    console.log("joined sector " + data.sector.uid)

    document.querySelector("#day_label").innerText = data.day
    document.querySelector("#hour_label").innerText = data.hour

    window.history.replaceState(null, null, "?")

    this.main.enableJoin()
    this.main.hideChangeLog()
    this.main.hideHomeMenu()
    this.main.gameExplorer.hideScreenshotsPopup()

    if (this.main.gameExplorer && this.main.gameExplorer.isAttachedToBody) {
      this.main.gameExplorer.attachToMiddleContainer()
    }

    if (this.requestGameTime) {
      this.joinedGameTime = (new Date()).getTime()
      this.measureInitialJoinTime()
      this.requestGameTime = null
    }

    // if I just Joined (need to cleanup prior)
    this.removeDataFromPreviousGame()
    this.initSector(data.sector)

    this.initSidebar(data.sidebar)

    if (data.objectives) {
      this.questMenu.setObjectives(data.objectives)
    }

    if (this.isPvP()) {
      Cookies.set('pvpSectorUid', this.sector.uid)
    }

    this.initGameModeUI()
    this.blueprintMenu.updateAllowedCraftables()

    if (!this.measurePingInterval) {
      this.measurePingInterval = setInterval(this.calculatePing.bind(this), 3000)
    }

    document.querySelector(".disconnected_msg").style.display = 'none'
    this.updateRoomOxygenBar(0,100)

    this.deathScreen.style.display = 'none'
    document.getElementById("save_progress").style.display = 'none'

    this.showHUD()
    this.showGameCanvas()

    if (this.neverInitialized) {
      app.ticker.add((time) => {
        try {
          this.updateGame(time)
        } catch(e) {
          ExceptionReporter.captureException(e)
        }
      })

      this.neverInitialized = false
    }

    this.hasJoinedGame = true

    this.playerId = data.playerId // set playerId of current player
    Cookies.set('uid', data.uid)

    this.setTeams(data.teams)
    this.roles = data.roles

    this.sector.initPlayers(data)
    this.sector.setSettings(data.sector.settings)
    this.teamMenu.renderRoles()
    this.entityMenu.createPermissions()
    this.entityMenu.populateSpawnPointSelectors()

    if (this.isMiniGame()) {
      // render invite link
      this.renderInviteLink(this.sector.uid)
    }

    this.setTeamVisibility()
    this.mapMenu.reinit()

    if (!this.player) {
      alert("error loading game")
      return
    }

    this.player.setOxygen(data.oxygen)
    this.player.setHunger(data.hunger)
    this.player.setStamina(data.stamina)
    this.player.setGold(data.gold)

    this.renderInventory(data)
    this.onEquipIndexChanged(data)

    this.updateInGameMenu()
    this.chatMenu.setGlobalTabRegion()
    this.chatMenu.requestChatHistory()

    if (data.serverRestartTimestamp) {
      this.onServerRestartCountdown({ timestamp: data.serverRestartTimestamp, reason: data.restartReason })
    }

    if (window.debugRoom || debugMode) {
      document.querySelector("#debug_control_panel").style.display = 'block'
    }

    if (this.main.isMobile) {
      this.zoom(1.5) // mobile needs larger zoom
    }

    SocketUtil.emit("PlayerReady", {})


    if (!this.isTutorial()) {
      if (this.isCreatedByPlayer()) {
        this.welcomeMenu.open()
      }
      this.walkthroughMenu.close()
      this.playBackgroundMusic()
      if (this.sector.shouldShowChat()) {
        document.querySelector("#chat_toggle_btn").style.display = 'inline-block'
      }

      if (this.shouldBeAddedToMineColonies(this.sector.uid)) {
        this.addToMineColonies(this.sector.uid)
      }
    } else {
      this.walkthroughMenu.open()
      this.playBackgroundMusic()
      document.querySelector("#chat_toggle_btn").style.display = 'none'
    }

    if (!this.player.isSectorOwner()) {
      document.querySelector(".command_block_tab_container").style.display = 'none'
      this.commandBlockMenu.selectTab('triggers')
    } else {
      document.querySelector(".command_block_tab_container").style.display = 'block'
    }

    document.querySelector(".upvote_count").innerText = data.sector.upvoteCount

    this.teamMenu.updateColonySettings(data.sector.settings)
    this.selectDifficultyMenu.showGameMode(this.sector.gameMode)

    if (data.hasUpvoted) {
      this.renderUpvoteFilled(data.hasUpvoted)
    }

    this.onFavoriteCountChanged()
    this.resizeCanvas()

    this.initDialogue(data)

    this.displayStickyAnnouncement()

    if (this.main.userData && !this.main.userData.isRulesRead) {
      document.querySelector("#rules_menu").style.display = 'block'
    }

    if (typeof aipAPItag !== 'undefined') {
      aipAPItag.hideConsentToolButton()
    }

    if (data.fullMap) {
      data.fullMap.chunks.forEach((chunk) => {
        this.sector.onChunk(chunk, { sync: true })
      })
    }

    // let joinDuration = Date.now() - this.joinGameTime
    // console.log("map load after join took: " + joinDuration + "ms")
  }

  initDialogue(data) {
    this.dialogueMap = data.dialogueMap
  }

  displayStickyAnnouncement() {
    if (this.isPvP()) {
      document.querySelector("#game_sticky_announcement").innerText = "Map resets in Day 600"
    } else {
      document.querySelector("#game_sticky_announcement").innerText = ""
    }
  }

  renderInviteLink(sectorUid) {
    let params = window.location.search
    params = ClientHelper.replaceQueryParam('e', sectorUid, params)
    let inviteLink = this.main.getBrowserHost() + params

    document.querySelector("#minigame_invite_container .invite_link_input").value = inviteLink
  }

  shouldBeAddedToMineColonies(sectorUid) {
    return this.isLoggedIn() &&
           this.isCreatedByPlayer() &&
           !this.main.gameExplorer.mineColonyEntries[sectorUid]
  }

  initSidebar(data) {
    this.sidebarMenu.setVisible(data.isVisible)
    for (let index in data.rows) {
      this.sidebarMenu.setRowText(index, data.rows[index])
    }
  }

  isLoggedIn() {
    return this.main.isLoggedIn()
  }

  updateInGameMenu() {
    if (this.isLoggedIn() && this.isCreatedByPlayer()) {
      document.querySelector(".exit_game_menu_btn").innerText = i18n.t("Save and Quit")
    } else {
      document.querySelector(".exit_game_menu_btn").innerText = i18n.t("Exit Game")
    }
  }

  async addToMineColonies(sectorUid) {
    let result = await this.main.getUserRecord(this.main.uid)

    if (!result.error) {
      let saveEntries = result.saves
      this.main.gameExplorer.addMyColonies(saveEntries)
    }
  }

  isTutorial() {
    return this.sector.isTutorial()
  }

  isMiniGame() {
    return this._isMiniGame
  }

  visitSector(sectorUid) {

  }

  setEffectsVolume(volume) {
    let soundNames = this.getEffectsSoundNames()

    soundNames.forEach((soundName) => {
      this.setVolume(soundName, volume)
    })
  }

  setBackgroundVolume(volume) {
    let soundNames = this.getBackgroundSoundNames()

    soundNames.forEach((soundName) => {
      this.setVolume(soundName, volume)
    })
  }

  setVolume(soundName, volume) {
    if (!this.sounds) return

    if (this.sounds[soundName]) {
      this.sounds[soundName].volume(volume)
    }
  }

  isMobile() {
    return this.main.isMobile
  }

  setTeamVisibility() {
    if (!this.isGameCreatedByPlayer()) return
    if (this.isAnonymousGame()) return

    let privacy = document.querySelector('.visibility_select').value
    if (privacy === 'private') {
      SocketUtil.emit("EditTeam", { id: this.player.teamId, isPrivate: true })
    } else {
      SocketUtil.emit("EditTeam", { id: this.player.teamId, isPrivate: false })
    }
  }

  renderInventory(data) {
    for (let index in data.inventory.storage) {
      let inventory = data.inventory.storage[index]
      this.onInventoryChanged({ inventory: inventory })
    }
  }

  isGameCreatedByPlayer() {
    return this.creatorUid === this.playerUid
  }

  findOwnerById(ownerId) {
    if (ownerId === 1) return this.sector

    let team = this.teams[ownerId]
    if (team) return team

    let player = this.sector.players[ownerId]
    if (player) return player

    return null
  }


  hideDeathMessage() {
    if (this.deathMessageTween) {
      this.deathMessageTween.stop()
      this.deathMessageTween = null
    }

    this.deathScreen.style.opacity = 0
    this.deathScreen.style.display = 'none'
  }

  showDeathScreenImmediate() {
    document.querySelector("#death_screen_container").classList.add("now")
    this.deathScreen.style.display = 'block'

    if (this.sector.isMiniGame()) {
      this.showDeathMiniGameAction()
    } else {
      this.hideDeathMiniGameAction()
    }
  }

  showDeathMiniGameAction() {
    document.querySelector("#death_minigame_action_container").style.display = 'block'
    if (this.sector.isPrivate) {
      document.querySelector("#death_screen_container .play_again_btn").style.display = 'none'
      document.querySelector("#death_screen_container .exit_minigame_btn").style.display = 'inline-block'
    } else {
      document.querySelector("#death_screen_container .play_again_btn").style.display = 'inline-block'
      document.querySelector("#death_screen_container .exit_minigame_btn").style.display = 'none'
    }
  }

  hideDeathMiniGameAction() {
    document.querySelector("#death_minigame_action_container").style.display = 'none'
  }

  showDeathMessage(canRespawn) {
    document.querySelector("#death_screen_container").classList.remove("now")

    let opacity = { opacity: 0 }
    this.deathScreen.style.display = 'block'
    this.hideDeathMiniGameAction()

    if (this.sector.isMiniGame() && !canRespawn) {
      document.querySelector("#death_screen_action_container").style.display = 'none'
      setTimeout(() => {
        this.showDeathMiniGameAction()
      }, 3000)
    } else {
      document.querySelector("#death_screen_action_container").style.display = 'block'
      this.hideDeathMiniGameAction()
    }

    this.deathMessageTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0.85 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => { // Called after tween.js updates 'coords'.
            // Move 'box' to the position described by 'coords' with a CSS translation.
            this.deathScreen.style.opacity = opacity.opacity
        })

    this.deathMessageTween.start()

    this.displayDeathAd()
  }

  displayDeathAd() {
    if (debugMode) return
    let threeMinutes = 1000 * 60 * 3
    let shouldRefreshAd = !this.lastDeathAdDisplay ||
                          (this.lastDeathAdDisplay && ((Date.now() - this.lastDeathAdDisplay) > threeMinutes))
    if (shouldRefreshAd) {
      aiptag.cmd.display.push(function() {
        aipDisplayTag.display('junon-io_728x90');
      })

      this.lastDeathAdDisplay = Date.now()
    }
  }

  showRestartCountdown(startTime, duration) {
    let durationInSeconds = duration / 1000
    document.querySelector("#restart_countdown").style.display = 'block'
    document.querySelector("#restart_countdown_number").innerText = durationInSeconds
    document.querySelector("#restart_btn").style.display = 'none'

    this.restartCountdownInterval = setInterval(() => {
      let elapsed = Date.now() - startTime
      let remaining = Math.max(0, duration - elapsed)
      let remainingInSeconds = Math.round(remaining / 1000)
      if (remainingInSeconds === 0) {
        clearInterval(this.restartCountdownInterval)
        document.querySelector("#restart_countdown").style.display = 'none'
        document.querySelector("#restart_btn").style.display = 'inline-block'
      } else {
        document.querySelector("#restart_countdown_number").innerText = remainingInSeconds
      }
    }, 1000)
  }

  clearChat() {
    Array.from(document.querySelectorAll(".chat_history")).forEach((el) => {
      el.innerHTML = ""
    })
  }

  removeDataFromPreviousGame(options = {}) {
    try {
      this.stopHudAlertTween()
      this.stopScreenWarp()

      this.terminalMenu.isChoiceSubmitted = false
      TWEEN.removeAll()

      if (this.player) {
        this.player.resetBuildMode()
      }

      this.setCustomCanvasSize(null, null)
      this.resizeCanvas()

      this.deleteHoldItemInventorySlot()

      if (this.sector) {
        this.sector.remove()
      }

      for (let description in this.eventCountdownIntervals) {
        clearInterval(this.eventCountdownIntervals[description])
      }
      document.querySelector("#events_menu").innerHTML = ""

      this.visibleChunk = null

      if (this.regionManager) {
        this.regionManager.cleanup()
      }

      this.shouldDenyMenuOpen = false

      this.cleanInventoryCooldowns()
      this.cleanSounds()
      this.clearChat()
      this.hideActionTooltip()
      this.cleanMenus(options)
      this.resetInventory()
      if (this.inputController) {
        this.inputController.reset()
      }


      this.commandBlockMenu.cleanup()
      this.teamMenu.resetJoinableTeams()

      document.querySelector("#error_title").innerText = ""
      document.querySelector("#error_menu_content").innerText = ""

      // reset scale
      this.gameLayer.scale.set(1)

      clearInterval(this.measurePingInterval)
      this.measurePingInterval = null

      document.querySelector("#notice_board").innerHTML = ""

      Array.from(document.querySelectorAll(".modal_menu")).forEach((el) => {
        el.style.display = 'none'
      })

      clearInterval(this.waveCountdownInterval)

      this.initVariables(options)
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  isConnected() {
    return this.gameConnection.isConnected()
  }

  cleanSounds() {
    for (let soundName in this.currentSounds) {
      this.stopSound(soundName)
    }

    this.currentSounds = {}
  }

  cleanMenus(options = {}) {
    this.closeAllMenus()

    let menusToExclude = options.menuExclude || []
    this.menus.forEach((menu) => {
      if (menusToExclude.indexOf(menu) === -1) {
        menu.cleanup()
      }
    })
  }

  onOtherPlayerJoined(data) {
    this.showPlayerJoinGameMessage(data.player.name)
    if (!this.sector) return

    this.sector.syncWithServerForGroups(["players"], { players: [data.player] })
    this.sector.addToOriginalPlayers(data.player)
  }

  showPlayerLeaveGameMessage(name) {
    let el = document.createElement("div")
    el.className = 'notice_board_row'
    el.innerText = name + " left the game"
    document.querySelector("#notice_board").appendChild(el)

    let fadeOutTween = ClientHelper.getFadeTween(el, 0.3, 0, 3000)
    fadeOutTween.start()
  }

  showPlayerJoinGameMessage(name) {
    let el = document.createElement("div")
    el.className = 'notice_board_row'
    el.innerText = name + " has joined the game"
    document.querySelector("#notice_board").appendChild(el)

    let fadeOutTween = ClientHelper.getFadeTween(el, 0.3, 0, 3000)
    fadeOutTween.start()
  }

  onPlayerDestroyed(data) {
    if (!this.sector) return

    const targetPlayer = this.sector.players[data.id]

    if (targetPlayer) {
      if (targetPlayer.isMe()) {
        this.player.setHealth(0)
        this.showDeathMessage(data.canRespawn)
        this.showRestartCountdown(Date.now(), data.restartCooldown)
      }
    }

    let originalPlayer = this.sector.originalPlayers[data.id]
    if (originalPlayer) {
      originalPlayer.health = 0
    }
  }

  showRepairMessage() {
    this.lastDestroyedTime = (new Date()).getTime()
    this.repairFinishTime = this.lastDestroyedTime + this.player.REPAIR_TIME
    this.isDestroyed = true
    document.querySelector("#repair_menu").style.display = "block"
  }


  onMothershipRepaired(data) {
    const targetPlayer = this.sector.players[data.id]
    targetPlayer.show()

    if (targetPlayer.isMe()) {
      this.isDestroyed = false
      document.querySelector("#repair_menu").style.display = "none"
    }
  }

  onCollisionDetected(data) {
    this.sector.onCollisionDetected(data)
  }

  onCircleCollision(data) {
    this.sector.onCircleCollision(data)
  }

  onRepairStarted(data) {
    this.showRepairMessage()
  }

  onErrorMessage(data) {
    this.displayError(data.message, { warning: data.isWarning, success: data.isSuccess, transparent: data.isTransparent, color: data.color, size: data.size, isTitle: data.isTitle })
  }

  resetInventory() {
    this.inventoryMenu.cleanup()
  }

  onRenderStorage(data) {
    let menu = this.menus.find((menu) => {
      return menu.storageId === data.id
    })

    if (menu) {
      if (menu.isClose()) menu.finishOpen()
      menu.updateStorageInventory(data)

      if (menu.shouldHideQuickInventory()) {
        menu.hideQuickInventory()
      }

      if (menu.hasPlayerInventory()) {
        menu.updateStorageInventory({
          id: Constants.inventoryStorageId,
          inventory: {
            storage: this.player.inventory
          }
        })
      }
    }
  }

  onMineralCapacityReached(data) {
    this.displayError("Can't store more Minerals. Upgrade Mineral Storage")
  }

  onWaveEnd(data) {
    document.querySelector(".wave_container").style.display = 'block'
    document.querySelector("#wave_remaining_time").style.display = 'block'

    const waveInterval = debugMode ? (5 * 1000) : (60 * 1000)
    document.querySelector("#wave_level").innerText = (data.level + 1) + "/3"

    this.nextWaveTime = (new Date()).getTime() + waveInterval

    this.waveCountdownInterval = setInterval(() => {
      let differenceInSeconds = Math.floor((this.nextWaveTime - (new Date()).getTime()) / 1000)
      this.waveIncomingTime.innerText = differenceInSeconds

      if (differenceInSeconds <= 0) {
        clearInterval(this.waveCountdownInterval)
        document.querySelector("#wave_remaining_time").style.display = 'none'
      }
    }, 100)
  }

  onCeilingHit(data) {

  }

  onWaveLevel(data) {
    document.querySelector(".wave_container").style.display = 'block'
    document.querySelector("#wave_level").innerText = (data.level + 1) + "/3"
  }

  showGameCanvas() {
    this.canvas.style.cssText = 'display: block !important'
  }

  hideGameCanvas() {
    this.canvas.style.cssText = 'display: none'
  }

  showHUD() {
    document.getElementById('base_hud').style.display = 'block'
    document.getElementById('welcome_hud').style.display = 'none'
    document.getElementById('welcome_container').style.display = 'none'
  }

  hideHUD() {
    document.getElementById('base_hud').style.display = 'none'
    document.getElementById('welcome_hud').style.display = 'block'
    document.getElementById('welcome_container').style.display = 'block'
  }

  updateShieldBar(curr, max) {
    this.shieldBar.querySelector(".bar_label").innerText = curr
    this.shieldBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  startOxygenLowTween() {
    const barContainer = this.oxygenBar.querySelector(".bar_container")
    let opacity = { opacity: 1 }

    if (!this.oxygenLowTween) {
      this.oxygenLowTween = new TWEEN.Tween(opacity)
          .to({ opacity: 0 }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            let color = "rgb(88,151,209," + opacity.opacity + ")"
            barContainer.style.backgroundColor = color
          })
          .onComplete(() => {
            barContainer.style.background = 'none'
          })
          .onStop(() => {
            barContainer.style.background = 'none'
          })
          .repeat(Infinity)
          .start()
    }
  }

  stopOxygenLowTween() {
    if (this.oxygenLowTween) {
      this.oxygenLowTween.stop()
      this.oxygenLowTween = null
    }
  }

  startHungerLowTween() {
    const barContainer = this.hungerBar.querySelector(".bar_container")
    let opacity = { opacity: 1 }

    if (!this.hungerLowTween) {
      this.hungerLowTween = new TWEEN.Tween(opacity)
          .to({ opacity: 0 }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(() => {
            let color = "rgb(212,115,35," + opacity.opacity + ")"
            barContainer.style.backgroundColor = color
          })
          .onComplete(() => {
            barContainer.style.background = 'none'
          })
          .onStop(() => {
            barContainer.style.background = 'none'
          })
          .repeat(Infinity)
          .start()
    }
  }

  stopHungerLowTween() {
    if (this.hungerLowTween) {
      this.hungerLowTween.stop()
      this.hungerLowTween = null
    }
  }

  showOxygenBar() {
    this.oxygenBar.style.display = 'block'
  }

  hideOxygenBar() {
    this.oxygenBar.style.display = 'none'
  }

  showStaminaBar() {
    this.staminaBar.style.display = 'block'
  }

  hideStaminaBar() {
    this.staminaBar.style.display = 'none'
  }

  showHungerBar() {
    this.hungerBar.style.display = 'block'
  }

  hideHungerBar() {
    this.hungerBar.style.display = 'none'
  }

  updateStaminaBar(curr, max) {
    this.staminaBar.querySelector(".bar_label").innerText = curr
    this.staminaBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  updateRoomOxygenBar(curr, max) {
    this.roomOxygenBar.querySelector("#oxygen_percentage_value").innerText = curr
    this.roomOxygenBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  updateOxygenBar(curr, max) {
    if (this.player && this.player.isLowStatus("oxygen")) {
      this.startOxygenLowTween()
    } else {
      this.stopOxygenLowTween()
    }

    this.oxygenBar.querySelector(".bar_label").innerText = curr
    this.oxygenBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  updateHungerBar(curr, max) {
    if (this.player && this.player.isLowStatus("hunger")) {
      this.startHungerLowTween()
    } else {
      this.stopHungerLowTween()
    }

    this.hungerBar.querySelector(".bar_label").innerText = curr
    this.hungerBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  updateHealthBar(curr, max) {
    this.healthBar.querySelector(".bar_label").innerText = curr
    this.healthBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  updateTotalTasksBar(curr, max) {
    this.totalTaskBar.querySelector(".bar_label").innerText = curr
    this.totalTaskBar.querySelector(".bar_fill").style.width = max ? (curr/max * 100) + "%" : "0%"
  }

  onLeaderboard(data) {
    if (!this.leaderboardMenu) return
    this.leaderboardMenu.update(data)
  }

  getPIXIOptions() {
  }

  initRenderer() {
    this.canvas = document.getElementById('game_canvas')

    let options = {
      view: this.canvas,
      forceCanvas: false,
      antialias: false,
      roundPixels: true,
      width: window.innerWidth,
      height: window.innerHeight
    }

    window.app = this.app = new PIXI.Application(options)

    let type = "WebGL"
    if(!PIXI.utils.isWebGLSupported()){
      type = "canvas"
    }

    PIXI.utils.sayHello(type)

    this.cameraDisplacement = {
      x: 0,
      y: 0
    }

    this.app.renderer.view.style.position = "absolute"
    this.app.renderer.view.style.display = "block"
    // this.app.renderer.backgroundColor = 0x000a19

    this.createGameLayer()
    this.createUILayer()
  }

  isCanvasMode() {
    if (!this.webGlSupport) {
      this.webGlSupport = PIXI.utils.isWebGLSupported()
    }

    return !this.webGlSupport
  }

  createGameLayer() {
    this.gameLayer = new PIXI.Container()
    this.gameLayer.name = "GameLayer"
    this.gameLayer.scale.y = 1
    this.gameLayer.scale.x = 1

    this.gameLayer.position.x = this.cameraDisplacement.x
    this.gameLayer.interactiveChildren = false

    this.app.stage.name = "Stage"
    this.app.stage.addChild(this.gameLayer)
  }

  createUILayer() {
    this.uiLayer = new PIXI.Container()
    this.uiLayer.name = "UILayer"
    this.app.stage.addChild(this.uiLayer)
  }

  getButtonBackgroundTexture() {
    if (!this.buttonBackgroundTexture) {
      let graphics = new PIXI.Graphics()
      graphics.beginFill(0x222222)
      graphics.lineStyle(2, 0x000000)
      graphics.drawRect(0, 0, 24, 24)
      graphics.endFill()

      this.buttonBackgroundTexture = this.app.renderer.generateTexture(graphics)
    }

    return this.buttonBackgroundTexture
  }

  createActionButton(name, spritePath, size, tint, clickCallback) {
    let container = new PIXI.Container()
    container.name = name
    container.interactive = true

    let buttonBackground = new PIXI.Sprite(this.getButtonBackgroundTexture())
    buttonBackground.anchor.set(0.5)
    buttonBackground.interactive = true

    let icon = new PIXI.Sprite(PIXI.utils.TextureCache[spritePath])
    icon.anchor.set(0.5)
    icon.width  = size
    icon.height = size
    icon.tint   = tint

    container.addChild(buttonBackground)
    container.addChild(icon)

    // container.on("mousedown", clickCallback)
    // container.on("touchstart", clickCallback)

    return container
  }

  createMobileBuildActionMenu() {
    this.buildActionMenu = new PIXI.Container()
    this.buildActionMenu.name = "BuildActionMenu"
    this.buildActionMenu.position.y = 64
    this.buildActionMenu.position.x = 64
    this.buildActionMenu.alpha = 0

    this.confirmBtn = this.createActionButton("ConfirmBtn", "check_icon.png", 16, 0x999999)
    this.confirmBtn.position.x = 30
    this.confirmBtn.onBtnClicked = this.onConfirmBtnClick.bind(this)

    this.rotateBtn = this.createActionButton("RotateBtn", "rotate_icon.png", 16, 0x999999)
    this.rotateBtn.name = "RotateBtn"
    this.rotateBtn.onBtnClicked = this.onRotateBtnClick.bind(this)

    this.cancelBtn = this.createActionButton("CancelBtn", "cancel_icon.png", 12, 0x999999)
    this.cancelBtn.position.x = -30
    this.cancelBtn.onBtnClicked = this.onCancelBtnClick.bind(this)

    this.buildActionMenu.addChild(this.confirmBtn)
    this.buildActionMenu.addChild(this.rotateBtn)
    this.buildActionMenu.addChild(this.cancelBtn)

    this.uiLayer.addChild(this.buildActionMenu)
  }

  onConfirmBtnClick() {
    if (this.player.isBuilding()) {
      this.player.placeBuilding()
    }

    this.buildActionMenu.alpha = 0
  }

  onRotateBtnClick() {
    if (this.player.isBuilding()) {
      this.player.building.rotateEquip()
    }
  }

  onCancelBtnClick() {
    this.player.requestEquipChange(-1) // cancel building

    this.buildActionMenu.alpha = 0
  }

  onZoomOutBtnClick() {
    this.zoomOut()
  }

  onZoomInBtnClick() {
    this.zoomIn()
  }

  zoomOut() {
    if (!window.zoomEnabled) return

    const currentZoomLevel = 1 / this.resolution
    let targetZoomLevel

    if (currentZoomLevel === this.MIN_ZOOM_LEVEL) {
      targetZoomLevel = 0.75
    } else if (currentZoomLevel < 1) {
      targetZoomLevel = 1
    } else {
      targetZoomLevel = currentZoomLevel + 1
    }

    if (targetZoomLevel >= this.MAX_ZOOM_LEVEL) targetZoomLevel = this.MAX_ZOOM_LEVEL

    this.zoom(targetZoomLevel)
  }

  zoomIn() {
    if (!window.zoomEnabled) return

    let targetZoomLevel

    const currentZoomLevel = 1 / this.resolution
    if (currentZoomLevel === 1) {
      targetZoomLevel = 0.75
    } else {
      targetZoomLevel = currentZoomLevel - 1
      if (targetZoomLevel <= this.MIN_ZOOM_LEVEL) targetZoomLevel = this.MIN_ZOOM_LEVEL
    }

    this.zoom(targetZoomLevel)
  }

  zoom(level) {
    let resolution = { resolution: this.resolution }

    if (!this.sector.isZoomAllowed()) return

    window.zoomEnabled = false // dont allow another zoom until this one is finished

    new TWEEN.Tween(resolution)
      .to({ resolution: 1 / level  }, 300)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        this.resolution = resolution.resolution
        this.gameLayer.scale.set(resolution.resolution)
        this.centerCameraToCameraFocusTarget()
      })
      .onComplete(() => {
        this.resizeCanvas({ zoom: true }) // since we changed scale, let server know of new calculated screenwidth
        this.player.cullChunks()
        this.onZoomLevelChanged()
        window.zoomEnabled = true
      })
      .start()
  }

  onZoomLevelChanged() {
    if (this.isMobile()) {
      let zoomLevel = 1 / this.resolution
      if (zoomLevel <= 1.5) {
        this.zoomOutBtn.style.display = 'block'
        this.zoomInBtn.style.display  = 'none'
      } else if (zoomLevel >= 3.5) {
        this.zoomOutBtn.style.display = 'none'
        this.zoomInBtn.style.display  = 'block'
      }
    }
  }

  onBeforeUnload() {
    SocketUtil.emit("LeaveGame", {})
  }

  scaleUsernameSprites(resolution) {
    Object.values(this.sector.players).forEach((player) => {
      player.usernameSprite.scale.set(1/resolution)
    })
  }

  initMyPlayer(player) {
    this.player   = player
    window.player = player

    const inputController = this.getInputController()
    inputController.setPlayer(player)

    this.centerCameraTo(this.player.getCameraFocusTarget())
  }

  isMouseHeld() {
    const controlKeys = this.inputController.controlKeys
    return controlKeys & Constants.Control.space
  }

  getInputController() {
    if (!this.inputController) {
      this.inputController = new InputController(this.player, this)
    }

    return this.inputController
  }

  centerCameraTo(entity) {
    if (this.isStarMapShown) return

    this.centerCameraToXY(entity.getX(), entity.getY())
  }

  centerCameraToXY(x, y) {
    let browserResolution = this.getPixelRatio()

    const displacementX = (x * this.resolution) - ((this.getCanvasWidth() * browserResolution) / 2)
    const displacementY = (y * this.resolution) - ((this.getCanvasHeight() * browserResolution) / 2)

    this.cameraDisplacement.x = -displacementX
    this.cameraDisplacement.y = -displacementY

    this.gameLayer.position.x = this.cameraDisplacement.x
    this.gameLayer.position.y = this.cameraDisplacement.y
  }

  setCustomCanvasSize(width, height) {
    this.customCanvasWidth = width
    this.customCanvasHeight = height
  }

  getCanvasWidth() {
    return this.customCanvasWidth || window.innerWidth
  }

  getCanvasHeight() {
    return this.customCanvasHeight || window.innerHeight
  }

  initKeyBindings() {
    this.keyBindings = {
      "move up":     87,          // 'w'
      "move left":   65,          // 'a'
      "move down":   83,          // 's'
      "move right":  68,          // 'd'
      "rotate":      82,          // 'r'
      "craft":       67,          // 'c'
      "inventory":   73,          // 'i'
      "map":         77,          // 'm'
      "colony":      80,          // 'p'
      "alliance":    70,          // 'f'
      "visit":       86,          // 'v'
      "command block": 75,        // k
      "interact":    69,          // 'e'
      "attack":      32,          // 'space'
      "upgrade":     85,          // 'u'
      "chat":        90,          // 'z'
      "zoom in":     187,         // =
      "zoom out":    189,         // -
      "camera mode": 117,         // f6
      "stats view":  116,         // f5
    }

    if (navigator.userAgent.search("Firefox") !== -1) {
      this.keyBindings["zoom in"] = 61
      this.keyBindings["zoom out"] = 173
    }

  }

  screenshot(position = 0) {
    let renderTexture = PIXI.RenderTexture.create(game_canvas.width, game_canvas.height)
    this.app.renderer.render(this.app.stage, renderTexture)
    let screenshot = this.app.renderer.plugins.extract.image(renderTexture)
    renderTexture.destroy(true)

    this.cropImage(screenshot, 600, 480, (dataUrl) => {
      let base64Image = dataUrl.replace("data:image/png;base64,","")
      SocketUtil.emit("AddScreenshot", { imageData: base64Image, position: position })

      this.lastScreenshotDay = this.day
    })

  }

  createRenderTexture(container) {
    let canvas = document.querySelector(".render_texture_debug")
    if (!canvas) {
      canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      canvas.classList.add("render_texture_debug")
      document.body.appendChild(canvas)
    }
    let renderTexture = PIXI.RenderTexture.create(512, 512)

    var m = new PIXI.Matrix();

    container.transform.localTransform.copy(m);
    m.invert();

    let bounds = container.getLocalBounds()

    let xDelta = bounds.x % 512
    let yDelta = bounds.y % 512

    m.tx -= (bounds.x - xDelta)
    m.ty -= (bounds.y - yDelta)

    this.app.renderer.render(container, renderTexture, true, m, true)
    let screenshot = this.app.renderer.plugins.extract.image(renderTexture)
    let ctx = canvas.getContext("2d")
    screenshot.onload = function() {
      ctx.clearRect(0, 0, 512, 512)
      ctx.drawImage(screenshot, 0, 0, 512, 512)
    }
  }

  upgradeSelectedEntity() {
    if (this.entityMenu.entity &&
        this.entityMenu.entity.isBuildingType() &&
        this.entityMenu.entity.getConstants().isUpgradable &&
        this.entityMenu.entity.isOwnedBy(this.player)) {
      SocketUtil.emit("EditBuilding", { id: this.entityMenu.entity.id, action: 'upgrade' })
    }
  }

  cropImage(image, width, height, cb) {
    let canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext("2d")
    let frameWidth  = width
    let frameHeight = height
    let sx = (window.innerWidth - frameWidth) / 2
    if (sx < 0) sx = 0

    let sy = (window.innerHeight - frameHeight) / 2
    if (sy < 0) sy = 0

    let sw = frameWidth
    let sh = frameHeight

    let dx = 0
    let dy = 0
    let dw = frameWidth
    let dh = frameHeight

    image.onload = function() {
      ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
      cb(canvas.toDataURL())
    }
  }

  onScreenshotUpdated(data) {
    this.sector.updateScreenshot(data)
    this.teamMenu.renderScreenshots(this.sector)
  }

  updateGame(time) {
    if (!this.player) return

    this.ticksSincePacket += 1

    let cameraFocusTarget = this.player.getCameraFocusTarget()
    if (!cameraFocusTarget.isPositionBased) {
      this.prevPlayerPosX = cameraFocusTarget.getX()
      this.prevPlayerPosY = cameraFocusTarget.getY()
    }

    this.applyMyInputs()
    this.sector.executeTurn()

    if (this.player) {
      this.player.executeTurn()
    }

    this.cameraFollow(cameraFocusTarget)

    if (this.isDestroyed) {
      this.updateRepairTime()
    }

    this.miniMapMenu.updateViewport()

    TWEEN.update()

    this.lastFrameTime = (new Date()).getTime()
  }

  updateRepairTime() {
    const secondsRemaining = (this.repairFinishTime - this.lastFrameTime) / 1000
    const repairTimeFormatted = Helper.stringifyTimeShort(secondsRemaining)
    document.querySelector("#repair_remaining_time").innerText = repairTimeFormatted
  }

  getRoom(row, col) {
    let result

    for (let id in this.sector.rooms) {
      let room = this.sector.rooms[id]
      if (room.hasTile(row, col)) {
        result = room
        break
      }
    }

    return result
  }

  cameraFollow(cameraFocusTarget) {
    if (this.isStarMapShown) return
    if (cameraFocusTarget.isPositionBased) return

    const playerXDiff = cameraFocusTarget.getX() - this.prevPlayerPosX
    const playerYDiff = cameraFocusTarget.getY() - this.prevPlayerPosY

    if (playerXDiff !== 0) {
      this.cameraDisplacement.x   -= playerXDiff * this.resolution
      this.gameLayer.position.x = this.cameraDisplacement.x

      const mousePos = this.app.renderer.plugins.interaction.mouse.global
      if (this.player.building) {
        this.player.building.renderAtMousePosition(mousePos.x, mousePos.y)
      }
    }

    if (playerYDiff !== 0) {
      this.cameraDisplacement.y   -= playerYDiff * this.resolution
      this.gameLayer.position.y = this.cameraDisplacement.y

      const mousePos = this.app.renderer.plugins.interaction.mouse.global
      if (this.player.building) {
        this.player.building.renderAtMousePosition(mousePos.x, mousePos.y)
      }
    }

  }

  panViaControl(controlKeys) {
    const panSpeed = 4
    if (controlKeys & Constants.Control.left) {
      this.cameraDisplacement.x   += panSpeed
      this.gameLayer.position.x = this.cameraDisplacement.x
    }

    if (controlKeys & Constants.Control.right) {
      this.cameraDisplacement.x   -= panSpeed
      this.gameLayer.position.x = this.cameraDisplacement.x
    }

    if (controlKeys & Constants.Control.up) {
      this.cameraDisplacement.y   += panSpeed
      this.gameLayer.position.y = this.cameraDisplacement.y
    }

    if (controlKeys & Constants.Control.down) {
      this.cameraDisplacement.y   -= panSpeed
      this.gameLayer.position.y = this.cameraDisplacement.y
    }
  }

  onRenderDebug(data) {
    if (!this.sector) return

    if (data.type === 'room') {
      console.log(data)
    } else if (data.type === 'mob') {
      let tokens = data.data.split("@__@")
      let id = tokens[0]
      let log = tokens[1]
      let mob = this.sector.getEntity(id)
      if (mob) {
        mob.addBehaviorLog(log)
      }
    }
  }

  onGainResource(data) {
    let typeName = Helper.getTypeNameById(data.type)
    let friendlyTypeName = typeName.replace(/([A-Z])/g, ' $1').trim() // space before capital letters
    ClientHelper.animateMineralIncreased(this.player.getX(), this.player.getY(), data.amount, i18n.t(friendlyTypeName))
  }

  onChunk(data) {
    if (!this.sector) return
    this.sector.onChunk(data)
  }

  onEntityUpdated(data) {
    if (!this.sector) return
    this.sector.onEntityUpdated(data)
  }

  onRoomTileUpdated(data) {
    this.sector.onRoomTileUpdated(data)
  }

  onCameraFocusTarget(data) {
    this.chatMenu.close()
    game_canvas.focus()

    let mob = this.sector.mobs[data.id]
    if (mob) {
      this.centerCameraTo(mob)
      this.player.setCameraFocusTarget(mob)
      return
    }

    if (data.id === this.player.id) {
      this.centerCameraTo(this.player)
      this.player.setCameraFocusTarget(this.player)
      return
    }

    let entity = this.sector.getEntity(data.id)
    if (entity) {
      this.centerCameraTo(entity)
      this.player.setCameraFocusTarget(entity)
      return
    }

    if (data.hasOwnProperty("row")) {
      let x = data.col * Constants.tileSize
      let y = data.row * Constants.tileSize
      this.centerCameraToXY(x, y)
      this.player.setCameraFocusTarget({ x: x, y: y, isPositionBased: true })
      return
    }

    // none found, maybe not initialized on client yet, save for later
    this.setPendingCameraFocusTargetId(data.id)
  }

  getPendingCameraFocusTargetId() {
    return this.cameraFocusTargetId
  }

  setPendingCameraFocusTargetId(id) {
    this.cameraFocusTargetId = id
  }



  onCraftSuccess(data) {
    if (data.isHarvested) {
      data.x = window.innerWidth
      data.y = window.innerHeight
      this.animateCraftSuccess(data)
    } else {
      this.openMenus.forEach((menu) => {
        // quickfix. tbd: figure out which menu doesnt have that func
        if (typeof menu.onCraftSuccess === 'function') {
          menu.onCraftSuccess(data)
        }
      })
    }
  }

  animateCraftSuccess(data) {
    const itemName = data.name
    const friendlyItemName = itemName.replace(/([A-Z])/g, ' $1').trim()
    const label = "+" + data.count + " " + i18n.t(friendlyItemName)

    const style  = { fontFamily : 'PixelForce', fontSize: 28, fill : 0x00ff00, align : 'center', stroke: "#000000", strokeThickness: 5, miterLimit: 3 }
    let text = document.createElement("span")
    text.className = "craft_success_label"
    text.innerText = label
    document.body.appendChild(text)

    text.style.top  = data.y + "px"
    text.style.left = data.x + "px"

    let position = { y: data.y }
    var tween = new TWEEN.Tween(position)
        .to({ y: data.y - 150 }, 1500)
        .onUpdate(() => {
          text.style.top = position.y + "px"
        })
        .onComplete(() => {
          document.body.removeChild(text)
        })
        .start()
  }

  onServerChat(data) {
    this.chatMenu.onServerChat(data)
  }

  hideGhostMenu() {
    document.querySelector("#exit_body_btn").style.display = 'none'
  }

  showGhostMenu() {
    document.querySelector("#exit_body_btn").style.display = 'block'
  }

  showPlayerHud() {
    document.querySelector("#player_quick_inventory_menu").style.display = 'block'
  }

  hidePlayerHud() {
    document.querySelector("#player_quick_inventory_menu").style.display = 'none'
  }

  isInputSameAsPrevious(controlKeys, moveAngle, idle, pressedKey) {
    if (this.main.isMobile) {
      return this.lastMoveAngle === moveAngle && this.lastIdle === idle
    } else {
      if (this.lastPressedKey !== pressedKey) return false
      return this.lastControlKeys === controlKeys 
    }
  }

  isPerformingAction(controlKeys) {
    if (this.main.isMobile) {
      return this.inputController.isPerformingMobileAction
    } else {
      return controlKeys & Constants.Control.space
    }
  }

  applyMyInputs() {
    if (!window.player) return
    if (this.isStarMapShown) return

    // check what keys are held
    const controlKeys = this.inputController.controlKeys
    const pressedKey = this.inputController.pressedKey
    const moveAngle = this.inputController.moveAngle
    const idle = this.inputController.idle

    if (player.isMining()) {
      if (player.canAct()) {
        player.mine()
        return
      }
    } else if (this.isPerformingAction(controlKeys)) {
      player.performAction()
    }

    if (this.isInputSameAsPrevious(controlKeys, moveAngle, idle, pressedKey)) return

    if (this.isPanMode) {
      return this.panViaControl()
    }

    if (this.main.isMobile) {
      SocketUtil.emit("PlayerInput", { angle: moveAngle, idle: idle })
    } else {
      SocketUtil.emit("PlayerInput", { controlKeys: controlKeys, pressedKey: pressedKey })
    }

    this.lastPressedKey = pressedKey
    this.lastControlKeys = controlKeys
    this.lastMoveAngle   = moveAngle
    this.lastIdle        = idle
  }

  getCoordFromMouse(clientX, clientY) {
    const cameraPositionX = -this.cameraDisplacement.x
    const cameraPositionY = -this.cameraDisplacement.y
    const x = cameraPositionX + clientX
    const y = cameraPositionY + clientY
    return { x: x, y: y }
  }



}

module.exports = Game
