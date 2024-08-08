const BaseEntity = require("./base_entity")
const Buildings = require("./buildings/index")
const Mobs = require("./mobs/index")
const Equipments = require("./equipments/index")
const Interpolator = require("./../util/interpolator")
const SpriteEventHandler = require("./../util/sprite_event_handler")
const PlayerCommon = require("./../../../common/entities/player_common")
const ShipMountable = require("./../../../common/interfaces/ship_mountable")
const Needs = require("./../../../common/interfaces/needs")
const SocketUtil = require("./../util/socket_util")
const Destroyable  = require("./../../../common/interfaces/destroyable")
const Upgradable  = require("./../../../common/interfaces/upgradable")
const Equipper  = require("./../../../common/interfaces/equipper")
const Helper = require("./../../../common/helper")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const HealthBar = require("./../components/health_bar")
const Ship = require("./ship")
const Item = require("./item")
const Camera = require("./camera")
const StatusManager = require("./status_manager")
const tinycolor = require("tinycolor2")
const BitmapText = require("../util/bitmap_text")

class Player extends BaseEntity {
  constructor(data, sector) {
    super(sector.game, data)

    this.sector = sector
    this.relativeX = data.relativeX
    this.relativeY = data.relativeY

    this.setAngle(data.angle)
    this.setShip(data.ship)

    this.initPlayerCommon()
    this.initDestroyable()
    this.initVariables(data)
    this.setTeam(data.team)
    this.initVisionLight()

    this.setEquipments(data)

    this.initNeeds()

    this.initUsernameHeight()
    this.setCameraFocusTarget(this)
    this.setActiveBuildingContainer(this.sector)

    this.healthBar = new HealthBar(this)
    this.statusManager = new StatusManager(this)

    this.uid = data.uid

    this.chunks = {}

    this.onPositionChanged()

    if (this.isDestroyed()) {
      this.renderDeadBody()
      if (this.isMe()) {
        this.game.showDeathScreenImmediate()
        this.game.showRestartCountdown(Date.now(), Constants.restartCountdown)
      }
    }

    this.interpolator.setOnNoPositionAvailableListener(this.onNoPositionAvailable.bind(this))

    if (this.isMe()) {
      this.game.updateHealthBar(this.health, this.getMaxHealth())
      this.game.updateOxygenBar(this.oxygen, this.getMaxOxygen())
      this.game.updateStaminaBar(this.stamina, this.getMaxStamina())
      this.game.updateHungerBar(this.hunger, this.getMaxHunger())
      this.game.initMyPlayer(this)

      this.game.teamStatusMenu.showTeamMembers(this.getTeam())
      if (!this.isSpectating()) {
        this.sector.lightManager.applyFov()
      }
    }
  }

  openMenu() {
    this.game.playerMenu.open(this)
  }

  getPlayerVisionRadius() {
    return Constants.tileSize * 11
  }

  hasCommandsPermission() {
    return this.isSectorOwner() || this.getRolePermissions()["UseCommands"]
  }

  isNotVisible() {
    return !this.sprite.visible
  }

  setVisible(visible) {
    this.sprite.visible = visible
  }

  isSectorOwner() {
    return this.game.creatorUid === this.uid
  }

  canEditCommandBlock() {
    if (this.sector.isTutorial()) return true
    return this.isSectorOwner()
  }

  initVisionLight() {
    this.visionLightCanvas = document.createElement("canvas")
    this.visionLightCanvas.className = "vision_light_canvas"
    let radius = this.getPlayerVisionRadius()
    let padding = 2
    this.visionLightCanvas.width  = radius * 2 + padding * 2
    this.visionLightCanvas.height = radius * 2 + padding * 2

    // document.body.appendChild(this.visionLightCanvas)

    this.visionLightSprite = new PIXI.Sprite()
    this.visionLightSprite.texture = PIXI.Texture.fromCanvas(this.visionLightCanvas)
    this.visionLightSprite.position.x = this.getX()
    this.visionLightSprite.position.y = this.getY()
    this.visionLightSprite.anchor.set(0.5)
    this.visionLightSprite.width  = radius * 2
    this.visionLightSprite.height = radius * 2

    this.redrawVisionLight()

    this.getContainer().dynamicLightSprite.addChild(this.visionLightSprite)

    // this.visionLight.beginFill(0xffffff)
    // this.visionLight.drawCircle(0,0, 32 * 3)
    // this.visionLight.endFill()
    // this.visionLight.position.x = this.getX()
    // this.visionLight.position.y = this.getY()

    // this.getContainer().lightMapContainer.addChild(this.visionLight)
  }

  getPlayerVisionColor() {
    let armorEquipment = this.getArmorEquipment()
    if (!armorEquipment) {
      if (this.isMe()) {
        return { r: 255,  g: 255, b: 255, a: 0.250 }
      } else {
        return { r: 255,  g: 255, b: 255, a: 0.000 } // i cant see other player's normal vision
      }

    }

    let armorColorRgb = tinycolor(armorEquipment.getLightColor()).toRgb()
    armorColorRgb.a = armorEquipment.getBrightness()

    return armorColorRgb
  }

  redrawVisionLight() {
    let radius = this.getPlayerVisionRadius()
    let padding = 2

    let playerVisionColor = this.getPlayerVisionColor()
    let visonRgbString = [playerVisionColor.r, playerVisionColor.g, playerVisionColor.b, playerVisionColor.a].join(",")

    // reset canvas first
    let ctx = this.visionLightCanvas.getContext("2d")
    ctx.clearRect(0, 0, this.visionLightCanvas.width, this.visionLightCanvas.height)

    // apply radial gradient
    let gradient = ctx.createRadialGradient(radius + padding, radius + padding , radius/4, radius + padding, radius + padding, radius)
    gradient.addColorStop(0, "rgba(" + visonRgbString + ")")
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.000)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.visionLightCanvas.width, this.visionLightCanvas.height)

    this.visionLightSprite.texture.update()
  }

  onClick() {
    this.game.interact(this)
    if (this.isHidden) return

    if (this.isMe()) {
      this.setActTarget(this)
    } else {
      this.game.showEntityMenu(this, { dontCloseMenus: true, selectedEntity: this, replaceSelected: true })
      this.game.selectEntity(this)
    }
  }

  onMouseOver() {
    super.onMouseOver()
    if (this.isMe()) return
    if (this.isHidden) return

    this.game.highlight(this)
    this.game.showEntityMenu(this)
  }

  isHiddenFromView() {
    return this.isHidden
  }

  onMouseOut() {
    super.onMouseOut()
    if (this.isMe()) return
    if (this.isHidden) return

    this.game.unhighlight(this)
    this.game.hideEntityMenu(this)
  }

  renderEntityMenu(entityMenu) {
    this.showStats(entityMenu)
    this.showAction(entityMenu)
  }

  showStats(entityMenu) {
    let stats = ""

    const health = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>Health</div>" +
                      "<div class='stats_value'>" + this.health + "/" + this.getMaxHealth() + "</div>" +
                  "</div>"

    const daysAlive = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>Days Alive</div>" +
                      "<div class='stats_value'>" + this.daysAlive + "</div>" +
                  "</div>"


    stats += health
    stats += daysAlive

    let team = this.getTeam()
    if (team) {
      const teamEntry = "<div class='entity_stats_entry'>" +
                            "<div class='stats_type'>Team</div>" +
                            "<div class='stats_value'>" + team.getName() + "</div>" +
                        "</div>"
      stats += teamEntry
    }

    entityMenu.querySelector(".entity_stats").innerHTML = stats
  }

  initPermissionSelect(entityMenu) {
    let permissionSelect = entityMenu.querySelector(".player_permissions_select")
    if (!permissionSelect) return
    permissionSelect.addEventListener("change", this.onPlayerPermissionsSelectChanged.bind(this))

    if (typeof this.roleType !== 'undefined') {
      permissionSelect.value = this.roleType
    }

  }

  onPlayerPermissionsSelectChanged(e) {
    e.preventDefault()
    let roleType = e.target.value
    let memberId = e.target.closest(".player_permissions_select").dataset.memberId 
    SocketUtil.emit("TeamMemberAction", { memberId: memberId, action: 'role', roleType: roleType })
  }

  isAdmin() {
    let team = this.getTeam()
    if (!team) return false

    return team.isAdmin(this)
  }

  isLeader() {
    let team = this.getTeam()
    if (!team) return false

    return team.isLeader(this)
  }

  showAction(entityMenu) {
    let actions = ""
    let permissionSelect = this.createRoleSelect(entityMenu)

    let team = this.game.player.getTeam()
    if (!team) return

    let sameTeam = this.getTeam() === team
    if (team.isAdmin(this.game.player) && sameTeam) {
      actions += permissionSelect
    }

    const playerKickBtn = "<div class='player_kick_btn ui_btn' data-action='kick'>" + i18n.t('Kick') + "</div>"
    const playerBanBtn = "<div class='player_ban_btn ui_btn' data-action='ban'>" + i18n.t('Ban') + "</div>"
    const playerAddFriendBtn = "<div class='player_add_friend_btn ui_btn' data-action='add_friend'><img src='/assets/images/add_friend_icon.png' /></div>"
    const playerFriendRequestPending = "<div class='pending_friend_request_label'>" + i18n.t('Friend request sent') + "</div>"

    if (this.game.teamMenu.canKickMembers(this.getTeam(), this)) {
      actions += playerKickBtn
      actions += playerBanBtn
    }

    if (this.game.isLoggedIn() && this.isLoggedIn()) {
      if (this.isMyFriend() || this.isFriendRequestPending()) {
          // actions += playerFriendRequestPending
      } else {
        actions += playerAddFriendBtn
      }
    }

    entityMenu.querySelector(".entity_action").innerHTML = actions

    this.initPermissionSelect(entityMenu)
  }

  isLoggedIn() {
    return !this.uid.match("-")
  }

  isMyFriend() {
    return this.game.main.friends[this.uid]
  }

  isFriendRequestPending() {
    return this.game.main.sentFriendRequests[this.uid] ||
           this.game.main.receivedFriendRequests[this.uid]
  }

  initUsernameHeight() {
    this.setUsernameHeight(Constants.Player.height  - 10)
  }

  isInventoryFull() {
    return this.getInventoryCount() >= this.getMaxInventoryCount()
  }

  getInventoryCount() {
    return Object.keys(this.inventory).length
  }

  getMaxInventoryCount() {
    return this.getConstants().inventoryCount
  }

  onEffectAdded(effect) {
    super.onEffectAdded(effect)
    this.addStatus(effect)
  }

  addStatus(effect) {
    this.statusManager.addStatus(effect)

    if (this.shouldShowStatusList(effect)) {
      this.game.statusListMenu.addStatus(effect)
    }

    this.onStatusAdded(effect)
  }

  shouldShowStatusList(effect) {
    if (!this.isMe()) return false

    let effects = ["rage", "fear", "poison", "stamina", "paralyze", "drunk", "miasma"]
    return effects.indexOf(effect) !== -1
  }

  removeStatus(effect) {
    this.statusManager.removeStatus(effect)

    if (this.shouldShowStatusList(effect)) {
      this.game.statusListMenu.removeStatus(effect)
    }
  }

  onEffectRemoved(effect) {
    super.onEffectRemoved(effect)
    this.removeStatus(effect)

    this.onStatusRemoved(effect)
  }

  onStatusAdded(effect) {
    if (effect === 'drunk') {
      if (this.isMe()) {
        this.game.startScreenWarp()
      }
    }
  }

  onStatusRemoved(effect) {
    if (effect === 'drunk') {
      if (this.isMe()) {
        this.game.stopScreenWarp()
      }
    }
  }

  isUsingDismantler() {
    let item = this.getActiveItem()
    return item && item.type === Protocol.definition().BuildingType.Dismantler
  }

  initVariables(data) {
    this.isHoldingAttack = true
    this.isAttacking = false
    this.isSleeping = false
    this.inventory = {}
    this.equipments = {}
    this.visibleChunks = {}

    this.level = data.level
    this.health = data.health
    this.name = data.name

    this.clientJoinTime = Date.now()
  }

  isImmuneToKick() {
    return false
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["players"]
  }

  setUsernameHeight(height) {
    // this.sprite.position.y = height
  }

  setTeam(team) {
    if (!team) return
      
    if (this.teamId !== team.id) {
      this.teamId = team.id
      this.onTeamChanged()
    }
  }

  isSameTeam(targetPlayer) {
    return this.teamId  === targetPlayer.teamId
  }

  getTeam() {
    return this.game.teams[this.teamId]
  }

  getName() {
    return this.name
  }

  onTeamChanged() {
    let team = this.getTeam()
    if (team) {
      let differentTeamName = team.name !== this.name
      let hasMultipleMembers = team.getMemberCount() > 1
      if (differentTeamName || hasMultipleMembers) {
        if (team.prefix === 'allow') {
          this.usernameText.sprite.text = "[" + team.name + "] " + this.name
        }
      } else {
        this.usernameText.sprite.text = this.name
      }
    } else {
      this.usernameText.sprite.text = this.name
    }

    if (this.game.teamMenu.isOpen()) {
      this.game.teamMenu.renderJoinableTeams()
    }
  }

  canChangeAngle() {
    return !this.isPilot && !this.isDestroyed() && !this.isWorking && !this.game.isScenePlaying
  }

  syncWithServer(data) {
    this.instructToMove(data.x , data.y)

    this.setPilotStatus(data.isPilot)
    this.setState(data)

    this.setUid(data.uid)
    this.setHealth(data.health)
    this.setLevel(data.level)
    this.setRelativePosition(data)
    this.setEquipments(data)
    this.setEffects(data.effects)
    this.setAttackState(data.isAttacking)
    this.setSleepState(data.isSleeping)
    this.setTeam(data.team)
    this.setDaysAlive(data.daysAlive)
    this.setIsAngleLocked(data.isAngleLocked)
    this.setDragTarget(data.dragTarget)
    this.setRoleType(data.roleType)
    this.setIsWorking(data.isWorking)
    this.setContainer(data.container)
    this.setMounted(data.mounted)
    this.setIsHidden(data.isHidden)
    this.setViewDistance(data.viewDistance)

    // set angle after equipments setup
    if (!this.isMe()) {
      // other players must see me rotate
      this.setAngleInterpolated(data.angle)
    } else {
      // rely on inputController to do client-side rotation for immediate feedback
    }

    if (this.isPilot || this.isWorking) {
      this.setAngleInterpolated(data.angle)
    }
    this.setShip(data.ship)
  }

  setDaysAlive(daysAlive) {
    let prevDaysAlive = this.daysAlive
    if (this.daysAlive !== daysAlive) {
      this.daysAlive = daysAlive
      this.onDaysAliveChanged(daysAlive)
    }
  }

  setIsAngleLocked(isAngleLocked) {
    this.isAngleLocked = isAngleLocked
  }

  setRoleType(roleType) {
    if (!this.sector.shouldShowPlayerList()) return

    if (this.roleType !== roleType) {
      this.roleType = roleType
      this.onRoleTypeChanged(roleType)
    }
  }

  setIsWorking(isWorking) {
    if (this.isWorking !== isWorking) {
      this.isWorking = isWorking
      this.onIsWorkingChanged(isWorking)
    }
  }

  onIsWorkingChanged(isWorking) {
    if (isWorking) {

    } else {

    }
  }

  setDragTarget(dragTarget) {
    let prevDragTargetId = this.dragTargetId

    if (dragTarget) {
      this.dragTargetId = dragTarget.id
    } else {
      this.dragTargetId = null
    }

    if (prevDragTargetId !== this.dragTargetId) {
      this.onDragTargetChanged()
    }
  }

  onDragTargetChanged() {
    if (this.isMe()) {
      this.sector.onSelectionChanged(this.sector.selection.selectedEntity)
    }
  }

  onRoleTypeChanged(roleType) {
    if (this.getTeam() && this.getTeam().prefix !== 'allow') {
      if (roleType === 0 ) {
        this.usernameText.sprite.text = "[guest] " + this.name
      } else {
        this.usernameText.sprite.text = this.name
      }
    }

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }

  onDaysAliveChanged(currDaysAlive) {
    // every 2 days
    if (currDaysAlive < 30 && currDaysAlive % 2 === 0) {
      if (debugMode) {
        console.log("production analytics will send day_passed event")
      } else {
        gtag('event', 'day_passed', { event_category: 'gameplay' })
      }
    }
  }

  isGuest() {
    return this.roleType === Protocol.definition().RoleType.Everyone
  }

  setAttackState(isAttacking) {
    if (this.isAttacking !== isAttacking) {
      this.isAttacking = isAttacking
      this.onAttackStateChanged()
    }
  }

  getTintableSprites() {
    let sprites = [this.body, this.hands]

    let armorEquipment = this.getArmorEquipment()
    if (armorEquipment) {
      sprites.push(armorEquipment.sprite)
    }

    return sprites
  }

  getFadeTween(sprite, start, end) {
    let opacity = { opacity: start }

    return new TWEEN.Tween(opacity)
        .to({ opacity: end }, 300)
        .onUpdate(() => {
          sprite.alpha = opacity.opacity
        })
        .onComplete(() => {
          opacity.opacity = start
        })
  }

  setPilotStatus(isPilot) {
    this.isPilot = isPilot
  }

  setUid(uid) {
    this.uid = uid
  }

  setRelativePosition(data) {
    if (data.relativeX !== this.relativeX || data.relativeY !== this.relativeY) {
      this.onRelativePositionChanged()
    }
    this.relativeX = data.relativeX
    this.relativeY = data.relativeY
  }

  onShipAssigned() {
    if (this.isMe()) {
      this.game.centerCameraTo(this.getCameraFocusTarget())
      this.setHangar(null)
    }
  }

  setContainer(container) {
    this.containerId = container.id
  }

  setMounted(mounted) {
    let prevMountedId = this.mountedId
    this.mountedId = mounted && mounted.id

    if (prevMountedId !== this.mountedId) {
      this.onMountedChanged(prevMountedId)
    }
  }

  setIsHidden(isHidden) {
    if (this.isHidden !== isHidden) {
      this.isHidden = isHidden

      if (this.isHidden) {
        this.sprite.alpha = 0
      } else {
        this.sprite.alpha = 1
      }
    }
  }

  setViewDistance(viewDistance) {
    if (this.viewDistance !== viewDistance) {
      this.viewDistance = viewDistance
      this.onViewDistanceChanged()
    }
  }

  onViewDistanceChanged() {
    if (this.isSpectating()) return
    if (!this.isMe()) return
    this.sector.lightManager.applyFov()
  }

  getMount() {
    if (!this.mountedId) return null

    return this.sector.getEntity(this.mountedId)
  }

  onMountedChanged(prevMountedId) {
    if (this.mountedId) {
      let origSprite = this.sprite
      this.sprite.parent.removeChild(this.sprite)
      this.sector.spriteLayers['units'].addChild(origSprite)
      // player entity might loaded first in client before mob
      setTimeout(() => {
        if (this.getMount() && this.getMount().usernameText) {
          this.getMount().usernameText.sprite.alpha = 0
        }
      }, 1000)
    } else {
      let origSprite = this.sprite
      this.sprite.parent.removeChild(this.sprite)
      this.sector.spriteLayers['players'].addChild(origSprite)
      setTimeout(() => {
        let prevMount = this.sector.getEntity(prevMountedId)
        if (prevMount && prevMount.usernameText) {
          prevMount.usernameText.sprite.alpha = 1
        }
      }, 1000)
    }

    this.game.setDefaultMobileAction()
  }

  setShip(ship) {
    if (ship) {
      if (this.shipId === ship.id) return
      if (this.sector.ships[ship.id]) {
        this.shipId = ship.id

        this.ship = this.sector.ships[ship.id]
        this.ship.pilot = this
        this.onShipAssigned()
      }
    } else {
      this.shipId = null
      this.ship = null
    }
  }

  setEquipments(data) {
    for (let slotIndex in this.equipments) {
      slotIndex = parseInt(slotIndex)
      let isEquipmentStillPresentOnServer = false

      for (let index in data.equipments.storage) {
        let equipment = data.equipments.storage[index]
        let sameSlotIndex = slotIndex === equipment.index
        let sameEquipmentId = this.equipments[slotIndex].id === equipment.id
        if (sameSlotIndex && sameEquipmentId) {
          isEquipmentStillPresentOnServer = true
        }
      }

      if (!isEquipmentStillPresentOnServer) {
        this.removeEquipment({ index: slotIndex })
      }
    }

    for (let index in data.equipments.storage) {
      let equipment = data.equipments.storage[index]
      this.renderEquipment(equipment)
    }
  }


  removeEquipment(data) {
    const index = data.index

    // remove UI slot
    if (this.isMe()) {
      const equipmentSlot = document.querySelector(".equipment_slot[data-index='" + index  + "']")
      if (equipmentSlot) {
        this.game.resetInventorySlot(equipmentSlot)
      }
    }

    // remove equipment
    const equipment = this.equipments[index]
    if (equipment) {
      delete this.equipments[index]
      equipment.remove()
      this.openHands() // reset hand position
    }

  }

  renderEquipment(data) {
    const index = data.index

    let existingEquipment = this.equipments[index]

    // equipment slot changed
    if (existingEquipment) {
      let isSameEquipment = data.id === existingEquipment.id
      if (isSameEquipment) {
        existingEquipment.syncWithServer(data)
      } else {
        existingEquipment.remove()
        existingEquipment = null
      }
    }

    // dont convert to else if (existingEquipment can become null above)
    if (!existingEquipment) {
      // init equipment
      data.user = this
      this.equipments[index] = Item.getKlass(data.type).build(this.game, data)
      this.equipments[index].onPostEquip()

      // render UI slot
      if (this.isMe()) {
        const equipmentSlot = document.querySelector(".equipment_slot[data-index='" + index  + "']")
        if (equipmentSlot) {
          this.game.renderInventorySlot(equipmentSlot, data)
        }
      }
    }
  }

  setAngle(angle) {
    if (this.isAngleLocked) return
    this.angle = angle
    this.characterSprite.rotation = this.getRadAngle()
  }

  getEffectableSprite() {
    return this.characterSprite
  }

  setAngleInterpolated(angle) {
    this.angle = angle
    this.instructToRotate(this.getRadAngle())
  }

  onLevelIncreased() {
  }

  setDirection(data) {
    if (data.direction === 0) return // we only care if its facing left/right

    const prevDirection = this.direction
    this.direction = data.direction

    const isDirectionChanged = prevDirection !== this.direction

    if (isDirectionChanged && this.direction !== 0) {
      this.setCharacterOrientation(this.direction)
      this.stopMine()
    }
  }

  setCharacterOrientation(direction) {
    const characterSpriteIndex = 0
    this.sprite.children[characterSpriteIndex].scale.x = direction
  }

  getTypeName() {
    return "Player"
  }

  getWidth() {
    return 40
  }

  getHeight() {
    return 40
  }

  setState(data) {
    const prevInvulnerable = this.isInvulnerable
    this.isInvulnerable = data.isInvulnerable

    const becameInvulnerable = prevInvulnerable !== this.isInvulnerable && this.isInvulnerable
    const becameVulnerable   = prevInvulnerable !== this.isInvulnerable && !this.isInvulnerable

    if (becameInvulnerable) {
      // this.setAlpha(0.5)
    } else if (becameVulnerable) {
    }
  }

  getDamagedTween() {
    let opacity = { opacity: 0.5 }

    const fadeOutTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0.2 }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.characterSprite.alpha = opacity.opacity
        })
        .onComplete(() => {
          this.characterSprite.alpha = 1
        })
        .repeat(10)
        .yoyo(true)

    return fadeOutTween
  }

  isMe() {
    return this.id === this.game.playerId
  }

  isDead() {
    return typeof this.sector.players[this.id] === "undefined"
  }

  hide() {
    this.sprite.alpha = 0
  }

  show() {
    this.sprite.alpha = 1
  }

  getSprite() {
    this.usernameSprite  = this.getUsernameSprite()

    this.characterSprite  = this.getCharacterSprite()
    this.characterSprite.alpha = 1
    Interpolator.mixin(this.characterSprite)

    this.sleepStatusContainer = new PIXI.Container()
    this.sleepStatusContainer.name = "SleepStatus"

    const sprite = new PIXI.Container()
    sprite.name = "Player"

    sprite.addChild(this.characterSprite)
    sprite.addChild(this.usernameSprite)
    sprite.addChild(this.sleepStatusContainer)

    return sprite
  }

  onNoPositionAvailable() {
  }

  getUsername() {
    return this.data.name
  }

  equipItem(item) {
    this.characterSprite.removeChild(this.weaponSprite)
    this.weaponSprite    = this.getWeaponSprite()
    this.characterSprite.addChild(this.weaponSprite)
  }

  getWeapon() {
    return this.equipments[Protocol.definition().EquipmentRole.Hand]
  }

  getWeaponSprite(x, y) {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getWeaponSpritePath()])

    sprite.anchor.set(-1)
    sprite.position.y = 15
    sprite.position.x = 0
    sprite.pivot.x = 0 //-Constants.Player.width / 2
    sprite.pivot.y = 0 //Constants.Player.height / 2

    return sprite
  }

  getRotatedAngle() {
    return this.getRadAngle()
  }

  getBuildOwnerId() {
    if (this.getTeam()) return this.getTeam().getId()
      
    return this.getId()
  }

  getUsernameSprite() {
    const margin = this.getHeight()

    const container = new PIXI.Container()
    container.position.y = margin
    container.name = "UsernameContainer"

    this.usernameText = BitmapText.create({ 
      label: "UsernameText",
      text: this.getUsername(), 
      align: 'center',
      spriteContainer: container
    })

    return container
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Player
  }

  getWeaponSpritePath() {
    return "blaster.png"
  }

  canAct() {
    return (new Date()).getTime() - this.lastActionTime > 200
  }

  getActiveItem() {
    return this.inventory[this.equipIndex]
  }

  hasMiningEquipment() {
    const itemData = this.getActiveItem()
    return Item.isMiningEquipment(itemData)
  }

  startMining(resource) {
    this.lastActionTime = (new Date()).getTime()

    SocketUtil.emit("StartMining", { id: resource.id })
  }

  hasMineTarget() {
    return this.hasMiningEquipment() && this.mineTarget
  }

  isMining() {
    return this.isMiningMode
  }

  toggleMiningMode() {
    this.setMiningMode(!this.isMining())
  }

  setMiningMode(isMiningMode) {
    if (this.isMiningMode !== isMiningMode) {
      this.isMiningMode = isMiningMode
      this.onMiningModeChanged(isMiningMode)
    }
  }

  onMiningModeChanged(isMiningMode) {
    if (isMiningMode) {
      // this.game.playSound("rock_grind", { loop: true })
    } else {
      // this.game.stopSound("rock_grind")
    }
  }

  setMineTarget(resource) {
    this.mineTarget = resource
  }

  getTintableSprite() {
    return this.body
  }

  interpolate(lastFrameTime) {
    this.interpolatePlayerCustom(lastFrameTime)
    this.update()
  }

  update() {
    this.statusManager.update()
  }

  getRotatableSprite() {
    return this.characterSprite
  }

  interpolatePlayerCustom(lastFrameTime) {
    const prev = { x: this.sprite.position.x, y: this.sprite.position.y }

    const prevGrid = { row: this.getRow(), col: this.getCol() }

    super.interpolate(lastFrameTime)
    const curr = { x: this.sprite.position.x, y: this.sprite.position.y }

    const currGrid = { row: this.getRow(), col: this.getCol() }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      let isGridPositionChanged = currGrid.row !== prevGrid.row || currGrid.col !== prevGrid.col

      this.onPositionChanged({ isGridPositionChanged: isGridPositionChanged })
    }


    if (this.isCameraMode) {
      this.getCamera().interpolate(lastFrameTime)
    }
  }

  onRelativePositionChanged() {
    this.onPositionChanged()
  }

  executeTurn() {
    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 3) === 0
    if (!isThreeSecondInterval) return

    this.checkFirePrescence()
  }

  onPositionChanged(options = {}) {
    const armor = this.getArmorEquipment()
    if (armor) {
      armor.animate(this)
    }

    let platform = this.getStandingPlatform()
    if (platform) {
      platform.animateWalk(this)
    }

    if (this.hangar) {
      this.sector.repositionFadeBlackSprite()
    }
    
    this.registerToChunk()

    this.repositionOnUnitMap()

    if (this.isMe()) {
      if (this.sector.isFovMode()) {
        this.game.mapMenu.setMapPosition(this, Protocol.definition().EntityType.Player)  
        this.game.mapMenu.redrawEntityMap()
      }

      this.highlightNearbyEntities()
      this.redrawVisionLightSprite()
      this.updateSelectedEntity()

      if (options.isGridPositionChanged) {
        this.game.mapMenu.repositionTo(this)
        this.game.miniMapMenu.displayPosition(this)

        if (this.isSpectating()) {

        } else {
          this.sector.lightManager.applyFov()
        }
      }

      this.cullChunks()

      if (!this.game.isMobile()) {
        // for mobile we dont want to trigger any mouseover events
        // and we cant rely on app.renderer.plugins.interaction.mouse.global anyway on mobile
        this.triggerEntityMouseEvents()
      }
    }
  }

  recalculateFovIfHitPresent(hits) {
    if (!this.sector.isFovMode()) return
    if (this.isSpectating() && this.isMe()) return

      
    for (var i = 0; i < hits.length; i++) {
      let hit = hits[i]
      if (this.isTileVisible(hit.row, hit.col)) {
        this.sector.lightManager.applyFov()
        break
      }
    }
  }

  isTileVisible(row, col) {
    let tileKey = [row, col].join("-")
    return this.sector.lightManager.fovTileHits[tileKey]
  }

  updateSelectedEntity() {
    if (!this.game.entityMenu.selectedEntity) return

    let distanceFromSelectedEntity = this.game.distanceBetween(this.game.entityMenu.selectedEntity, this)
    if (distanceFromSelectedEntity > Constants.tileSize * 10) {
      this.game.resetEntitySelection()  
    }
  }

  triggerEntityMouseEvents() {
    if (this.containerId > 1) return // im riding on tram

    if (this.game.inputController) {
      this.game.inputController.triggerEntityMouseEvents()
    }
  }

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  }

  cullChunks() {
    let visibleChunks = this.getVisibleChunks()
    // get chunks no longer visible
    for (let chunkId in this.visibleChunks) {
      let prevChunk = this.visibleChunks[chunkId]
      let isPrevChunkStillVisible = visibleChunks[chunkId]
      if (!isPrevChunkStillVisible) {
        prevChunk.hide()
      }
    }

    // get new visible chunks
    for (let chunkId in visibleChunks) {
      let chunk = visibleChunks[chunkId]
      let isChunkNewlyVisible = !this.visibleChunks[chunkId]
      if (isChunkNewlyVisible) {
        chunk.show()
      }
    }

    this.visibleChunks = visibleChunks
  }

  getGridViewport() {
    let viewport = {}

    let box = this.getCameraBoundingBox()
    viewport.minCol = Math.floor(box.minX / Constants.tileSize)
    viewport.maxCol = Math.floor(box.maxX / Constants.tileSize)
    viewport.minRow = Math.floor(box.minY / Constants.tileSize)
    viewport.maxRow = Math.floor(box.minY / Constants.tileSize)

    return viewport
  }

  redrawVisionLightSprite() {
    if (this.visionLightSprite) {
      // adjust position
      this.visionLightSprite.position.x = this.getX()
      this.visionLightSprite.position.y = this.getY()

      // apply occlusion (walls block light)
    }
  }

  highlightNearbyEntities() {
    if (!this.game.player) return // player not initialized yet

    if (!this.hasMouseTarget()) {
      this.checkInteractable(this)
    }
  }

  setMouseTarget(entity) {
    this.mouseTarget = entity
  }

  hasMouseTarget() {
    return !!this.mouseTarget
  }

  checkFirePrescence() {
    let padding = Constants.tileSize * 16
    let box = this.getPaddedRelativeBox(padding)

    let boundingBox = {
      minX: box.pos.x,
      maxX: box.pos.x + box.w,
      minY: box.pos.y        ,
      maxY: box.pos.y + box.h
    }

    let structures = this.getContainer().structureMap.search(boundingBox)
    let units = this.getContainer().unitMap.searchCollection(boundingBox)
    let hasStructureOnFire = structures.find((structure) => {
      return structure.isOnFire()
    })

    let hasUnitOnFire = units.find((unit) => {
      return unit.isOnFire()
    })

    if (hasStructureOnFire || hasUnitOnFire) {
      this.setHasDetectedFire(true)
    } else {
      this.setHasDetectedFire(false)
    }
  }

  setHasDetectedFire(hasDetectedFire) {
    if (this.hasDetectedFire !== hasDetectedFire) {
      this.hasDetectedFire = hasDetectedFire
      this.onHasDetectedFireChanged()
    }

  }

  onHasDetectedFireChanged() {
    if (this.hasDetectedFire) {
      if (!this.game.isSoundAlreadyPlaying("burning")) {
        this.game.playSound("burning", { loop: true })
      }
    } else {
      if (this.game.isSoundAlreadyPlaying("burning")) {
        this.game.stopSound("burning")
      }

    }
  }

  checkInteractable(entity) {
    let padding = 12
    let relativeBox = entity.getPaddedRelativeBox(padding)

    // account for direction player is facing
    const xp = Constants.tileSize * Math.cos(this.getRadAngle())
    const yp = Constants.tileSize * Math.sin(this.getRadAngle())

    const interactableCenter = { x: this.getX() + xp, y: this.getY() + yp }

    let checkFullBox = true
    const structureHits = this.getContainer().structureMap.hitTestTile(relativeBox, checkFullBox)
    const distributionHits = this.getContainer().distributionMap.hitTestTile(relativeBox, checkFullBox)
    const unitHits      = this.getContainer().unitMap.hitTestTileCollection(relativeBox, checkFullBox)
    const corpseHits      = this.getContainer().corpseMap.hitTestTileCollection(relativeBox, checkFullBox)
    const hits = structureHits.concat(unitHits).concat(corpseHits).concat(distributionHits)

    let closestHit = hits.filter((hit) => {
      let isNotSelf = hit.entity !== entity
      let isNotDragTarget = hit.entity.id !== this.dragTargetId
      return hit.entity && isNotSelf && hit.entity.isInteractable() && isNotDragTarget
    }).sort((a, b) => {
      let distanceA =  this.game.distance(interactableCenter.x, interactableCenter.y, a.entity.getX(), a.entity.getY())
      let distanceB =  this.game.distance(interactableCenter.x, interactableCenter.y, b.entity.getX(), b.entity.getY())
      return distanceA - distanceB
    })[0]

    if (closestHit && this.dragTargetId) {
      let isDragTargetStorage = closestHit.entity.hasCategory("drag_target_storage")
      if (isDragTargetStorage) {
        this.onInteractableFound(closestHit.entity)  
      }
    } else if (closestHit) {
      this.onInteractableFound(closestHit.entity)  
    } else if (this.dragTargetId) {
      let dragTarget = this.game.sector.getEntity(this.dragTargetId)
      if (dragTarget) {
        this.onInteractableFound(dragTarget)  
      }
    } else {
      if (this.dragTargetId) return
      let highlightedEntity = this.game.getHighlightedEntity()
      if (highlightedEntity && !Helper.isTargetWithinWalkRange(this, highlightedEntity)) {
        this.onInteractableOutOfRange(highlightedEntity)
      }
    }
  }

  isInteractable() {
    if (this.isControllingGhost()) {
      let isSelf = this.id === this.game.player.id
      return isSelf && !this.isDestroyed() // can only possses my own living body if its alive
    } else {
      return this.isDestroyed()
    }
  }

  onInteractableFound(entity) {
    // dont proceed if already selecting something else
    if (this.game.sector.persistentSelection.isShown()) return

    this.game.highlight(entity)
    this.game.showEntityMenu(entity)
  }

  onInteractableOutOfRange(entity) {
    if (entity && !entity.hasMouseOver()) {
      this.game.unhighlight(entity)
      this.game.hideEntityMenu(entity)
    }
  }

  setHangar(hangar) {
    const prevHangar = hangar
    if (this.hangar !== hangar) {
      this.hangar = hangar
      this.onHangarChanged(prevHangar)
    }
  }

  onHangarChanged(prevHangar) {
    if (this.hangar) {
      let shipId = this.hangar.content
      let ship = this.sector.ships[shipId]
      if (ship) {
        this.setActiveBuildingContainer(ship)
        this.sector.showHangarBackgroundSprite(this.hangar)
        this.sector.showHangarFadeBlackSprite()
      }
    } else {
      this.setActiveBuildingContainer(this.sector)
      this.sector.hideHangarBackgroundSprite()
      this.sector.hideHangarFadeBlackSprite()
    }
  }

  isPlayer() {
    return true
  }

  setPositionFromParent() {

  }

  getGroup() {
    return "players"
  }

  remove() {
    super.remove()
    this.removeFromUnitMap()

    if (this.usernameText) {
      this.usernameText.remove()
    }

    this.getContainer().unregisterEntity("players", this)

    if (this.chunk) {
      this.chunk.unregister("players", this)
    }

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.removeSelectedEntity()
    }

    this.statusManager.cleanup()

    if (this.handAnimationTween) {
      this.handAnimationTween.stop()
    }

    if (this.sleepTween) {
      this.sleepTween.stop()
    }

    if (this.damagedTween) {
      this.damagedTween.stop()
    }

  }

  stopBuilding() {
    if (this.isBuilding()) {
      this.requestEquipChange(-1)
    }
  }

  requestEquipChange(index) {
    SocketUtil.emit("ChangeEquip", { index: index })
  }

  isControllingPlayer() {
    return this.cameraFocusTarget instanceof Player
  }

  getRequirementInventorySupply(klass) {
    let type = klass.getType()
    let supply = 0

    for (let index in this.inventory) {
      let itemData = this.inventory[index]
      if (itemData && itemData.type === type) {
        supply += itemData.count
      }
    }

    return supply
  }


  changeEquip(index) {
    this.equipIndex = index

    const absoluteIndex = index

    const itemData = this.inventory[absoluteIndex]
    if (!itemData) {
      this.resetBuildMode()
      return
    }

    const klass = Item.getKlass(itemData.type)
    const klassType = Item.getKlassType(itemData.type)

    if (klassType === "building" || klassType === "terrain") {
      const pos = game.app.renderer.plugins.interaction.mouse.global
      this.enterBuildMode(klass, pos)
    } else {
      this.resetBuildMode()
    }
  }

  reEquipIndex(index) {
    const itemData = this.inventory[index]
    if (itemData) {
      const klass = Item.getKlass(itemData.type)
      const klassType = Item.getKlassType(itemData.type)

      if (klassType === "building") {
        const pos = game.app.renderer.plugins.interaction.mouse.global
        this.enterBuildMode(klass, pos)
      }
    }
  }

  enterBuildMode(buildingKlass, position) {
    let isSameBuilding = this.building && this.building.getType() === buildingKlass.getType()
    if (isSameBuilding) return

    this.resetBuildMode()
    this.game.closeEntityMenu()

    const container = this.getActiveBuildingContainer()

    const data = {
      x: container.getSnappedPosX(position.x, buildingKlass.getConstants().width),
      y: container.getSnappedPosY(position.y, buildingKlass.getConstants().height),
      container: container,
      isEquipDisplay: true
    }

    const building = new buildingKlass(this.game, data)
    this.building  = building
    this.building.onBuildStart()

    this.game.colorPickerMenu.applyBuildingTint(building)

    building.renderAtMousePosition(position.x, position.y)
  }

  getActiveBuildingContainer() {
    return this.buildingContainer
  }

  setActiveBuildingContainer(container) {
    this.buildingContainer = container
  }

  getStandingRegion() {
    return this.getContainer().getRegion(this.getX(), this.getY())
  }

  getContainer() {
    return this.ship || this.sector
  }

  resetBuildMode() {
    const container = this.getActiveBuildingContainer()

    if (this.building) {
      this.sector.invalidAreaSprite.alpha = 0
      this.sector.removeEntity(this.building, this.building.getGroup())
      this.building.onBuildStop()
      this.building = null
    }
  }

  getVisibleChunksList() {
    return Object.values(this.getVisibleChunks())
  }

  getScreenWidth() {
    return this.game.getScreenWidth()
  }

  getScreenHeight() {
    return this.game.getScreenHeight()
  }

  isBuildingPositionValid(buildContainer, building, gridCoord) {
    return building.constructor.isPositionValid(buildContainer,
                                                   gridCoord.x,
                                                   gridCoord.y,
                                                   building.getRotatedWidth(),
                                                   building.getRotatedHeight(),
                                                   building.getAngle(),
                                                   this,
                                                   building.getType(),
                                                   building)
  }

  getRole() {
    return this.game.roles[this.roleType]
  }

  getRolePermissions() {
    if (!this.getRole()) return {}
    return this.getRole().permissions
  }

  isSameBuildingRequest(data) {
    if (!this.buildingRequestData) return false

    return data.type == this.buildingRequestData.type &&
           data.x == this.buildingRequestData.x &&
           data.y == this.buildingRequestData.y &&
           data.containerId == this.buildingRequestData.containerId
  }

  performAction() {
    if (!this.isControllingPlayer()) return

    if (this.isBuilding()) {
      this.placeBuilding()
    } else if (this.hasUsableEquip() && this.canAct()) {
      this.act()
    }
  }

  placeBuilding() {
    const buildContainer = this.getActiveBuildingContainer()
    const gridCoord = buildContainer.getGridCoord(this.building.getX(), this.building.getY())

    let buildingRequestData = {
      type: this.building.getType(),
      angle: this.building.getAngle(),
      x: gridCoord.x,
      y: gridCoord.y,
      containerId: buildContainer.id
    }

    if (this.isSameBuildingRequest(buildingRequestData)) return
    if (!this.isBuildingPositionValid(buildContainer, this.building, gridCoord)) return

    this.game.playSound("place_object")
    this.buildingRequestData = buildingRequestData

    clearTimeout(this.clearBuildRequestData)
    this.clearBuildRequestData = setTimeout(() => {
      this.buildingRequestData = null
    }, 2000)

    SocketUtil.emit("Build", buildingRequestData)
  }

  hasUsableEquip() {
    const itemData = this.getActiveItem()
    if (!itemData) return true // bare hands

    return Item.isUsableEquipment(itemData)
  }

  mine() {
    if (!this.hasMineTarget()) {
      this.setMiningMode(false)
      return
    }

    this.lastActionTime = (new Date()).getTime()
    SocketUtil.emit("MineResource", { row: this.mineTarget.row, col: this.mineTarget.col })
  }

  act() {
    if (this.hasEffect("spin")) return
    this.lastActionTime = (new Date()).getTime()

    let data = this.actTarget ? { targetEntityId: this.actTarget.id }  : {}
    if (this.hasThrowDestination()) {
      let mousePos = this.game.inputController.getGlobalMousePos()
      data['targetX'] = mousePos.x
      data['targetY'] = mousePos.y
    }
    SocketUtil.emit("Act", data)
  }

  hasThrowDestination() {
    let item = this.getActiveItem()
    return item && Item.hasThrowDestination(item.type)
  }

  setActTarget(entity) {
    this.actTarget = entity
  }

  getActTarget() {
    return this.actTarget
  }

  getCamera() {
    if (!this.camera) {
      this.camera = new Camera()
      Interpolator.mixin(this.camera)
    }

    return this.camera
  }

  setCamera(camera) {
    let isCameraMode = !!camera

    if (this.isCameraMode !== isCameraMode) {
      this.isCameraMode = isCameraMode
      this.onCameraModeChanged(camera)
    }

    if (isCameraMode) {
      this.getCamera().instructToMove(camera.x, camera.y)
    }
  }

  onCameraModeChanged(camera) {
    if (this.isCameraMode) {
      this.setCameraFocusTarget(this.getCamera())
      console.log("onCameraModeChanged..tocamera")
      this.getCamera().position.x = camera.x
      this.getCamera().position.y = camera.y
      this.game.centerCameraTo(this.getCamera())
    } else {
      this.setCameraFocusTarget(this)
      this.game.centerCameraTo(this)
    }
  }

  isControllingGhost() {
    return this.getCameraFocusTarget() instanceof Mobs.Ghost
  }

  isControllingMob() {
    return !this.isControllingPlayer() && !this.isControllingGhost()
  }

  getCameraFocusTarget() {
    return this.cameraFocusTarget
  }

  setCameraFocusTarget(target) {
    this.cameraFocusTarget = target
    this.onCameraFocusTargetChanged()
  }

  onCameraFocusTargetChanged() {
    if (this.isControllingPlayer()) {
      this.game.showPlayerHud()
    } else {
      this.game.hidePlayerHud()
    }

    this.cullChunks()

    if (this.isMe() && this.sector.isFovMode()) {
      if (this.shouldSkipFov()) {
        this.sector.lightManager.removeFov()
        this.sector.removeFovMaskFromLight()
      } else {
        this.sector.lightManager.applyFov()
        this.sector.applyFovMaskToLight()
      }
    }
  }

  shouldSkipFov() {
    if (this.isSpectating()) return true
    if (this.game.securityCameraMenu.isOpen()) return true
    return false
  }

  isSpectating() {
    return this.sector.isMiniGame() && this.health === 0
  }

  renderDeadBody() {
    this.addDizzyEyes(this.characterSprite)
    this.dizzySprite.anchor.set(0)
    this.dizzySprite.rotation = Math.PI/2
    this.dizzySprite.tint = 0x000000
    this.dizzySprite.width = 24
    this.dizzySprite.height = 8
    this.dizzySprite.position.x = 30
    this.dizzySprite.position.y = 8

    this.hideEquipments()
  }

  canBuildInRegion(buildFlag) {
    if (buildFlag === 'everyone') return true

    let isTeamRestricted = this.game.teams[buildFlag]
    let isRoleRestricted = this.game.getRoleByName(buildFlag)

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

  hideEquipments() {
    for (let index in this.equipments) {
      let equipment = this.equipments[index]
      equipment.sprite.alpha = 0
    }    
  }

  showEquipments() {
    for (let index in this.equipments) {
      let equipment = this.equipments[index]
      equipment.sprite.alpha = 1
    }    
  }

  isBuilding() {
    return this.building
  }

  getMissingResources(cost) {
    let missing = {}

    const requirements = cost
    for (let resourceName in requirements) {
      let value = requirements[resourceName]
      if (this[resourceName] < value) {
        missing[resourceName] = true
      }
    }

    return missing
  }

  notifyLowStatus(stat) {
    if (this.isLowStatus(stat)) {
      this.addStatus(stat)
    } else {
      this.removeStatus(stat)
    }
  }

  getMaxViewDistance() {
    return this.viewDistance || Constants.fovViewDistance
  }

  displayLowStatusWarning(stat) {
    switch(stat) {
      case "oxygen":
        this.game.displayError("You are running out of oxygen")
        break
      case "hunger":
        this.game.displayError("You are feeling hungry")
        break
      case "thirst":
        this.game.displayError("You are feeling thirsty")
        break
      case "stamina":
        this.game.displayError("You are tired and restless")
        break
      default:
    }
  }

  getOxygen() {
    const armor = this.getArmorEquipment()
    if (armor && typeof armor.hasOxygen === 'function' && armor.hasOxygen()) {
      return armor.oxygen
    } else {
      return this.oxygen
    }
  }

}

Object.assign(Player.prototype, Upgradable.prototype)
Object.assign(Player.prototype, PlayerCommon.prototype, {
  onGoldChanged(delta) {
    if (!this.isMe()) return

    this.game.updateGoldCount(this.gold, delta)
  }
})

Object.assign(Player.prototype, Destroyable.prototype, {
  onHealthReduced(delta) {
    if (this.health === 0) return

    this.healthBar.showDamageTaken(delta)
    this.animateDamage()

    if (this.damagedTween) this.damagedTween.stop()
    this.damagedTween = this.getDamagedTween()
    this.damagedTween.start()
  },
  onHealthIncreased(delta) {
    this.healthBar.showHealthIncreased(delta)

    const isIncreasedFromZero = this.health === delta
    if (isIncreasedFromZero) {
      this.resurrectBody()
      this.showEquipments()
    }
  },
  onHealthZero() {
    if (this.game.securityCameraMenu.isOpen() && this.isMe()) {
      this.game.securityCameraMenu.close()
    }

    this.renderDeadBody()
    if (this.sector.originalPlayers[this.getId()]) {
      this.sector.originalPlayers[this.getId()].health = 0
    }
  },
  onPostSetHealth() {
    if (this.isMe()) {
      this.game.updateHealthBar(this.health, this.getMaxHealth())
    }

    if (this.sector.originalPlayers[this.getId()]) {
      this.sector.originalPlayers[this.getId()].health = this.health
    }

    if (this.health > 0 && !this.sprite.visible) {
      // respawned
      this.sprite.visible = true
      this.game.hideDeathMessage()
    }

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  },
  getMaxHealth() {
    if (this.game.sector.entityCustomStats[this.id]) {
      return this.game.sector.entityCustomStats[this.id].health
    }
    
    return 100
  }

})

Object.assign(Player.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    if (this.effects && this.hasEffect("poison") && this.getEffectInstance("poison")) {
      return this.getEffectInstance("poison").getTint()
    }

    return 0xd2b48c
  },
  getBodySpriteTint() {
    return 0xd2b48c
  }
})

Object.assign(Player.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.sprite.position.x
  },
  getRelativeY() {
    return this.sprite.position.y
  }
})


Object.assign(Player.prototype, Needs.prototype, {
  onOxygenChanged() {
    if (!this.isMe()) return

    this.game.updateOxygenBar(this.getOxygen(), this.getMaxOxygen())
    this.notifyLowStatus("oxygen")
  },
  getMaxStamina() {
    if (this.game.isPvP()) return 300
    return Constants.Player.stamina
  },
  getMaxOxygen() {
    const armor = this.getArmorEquipment()
    if (armor && typeof armor.hasOxygen === 'function' && armor.hasOxygen()) {
      return armor.getMaxOxygen()
    } else {
      return this.getConstants().oxygen
    }
  },
  onStaminaChanged() {
    if (!this.isMe()) return

    if (!this.sector.settings['isStaminaEnabled']) return

    this.game.updateStaminaBar(this.stamina, this.getMaxStamina())
    this.notifyLowStatus("stamina")
  },
  onHungerChanged(delta) {
    if (!this.isMe()) return

    if (!this.sector.settings['isHungerEnabled']) return

    let isHungerDecreased = delta > 0
    if (isHungerDecreased) {
      this.animateHungerDecreased(delta)
    }

    this.game.updateHungerBar(this.hunger, this.getMaxHunger())
    this.notifyLowStatus("hunger")
  },
  onSleepStateChanged() {
    if (this.isSleeping) {
      this.showSleepAnimation()
    } else {
      this.hideSleepAnimation()
    }
  }

})

module.exports = Player
