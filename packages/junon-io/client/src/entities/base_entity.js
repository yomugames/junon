const Interpolator = require("./../util/interpolator")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const Helper = require("./../../../common/helper")
const ClientHelper = require("./../util/client_helper")
const Taintable = require("./../../../common/interfaces/taintable")
const Definable = require("./../../../common/interfaces/definable")
const Categorizable = require("./../../../common/interfaces/categorizable")
const Effects = require("./effects/index")
const BitmapText = require("../util/bitmap_text")
const ChatBubble = require("./chat_bubble")

class BaseEntity {
  constructor(game, data) {
    this.setEntityAttributes(game, data)
    this.initSprite(data.x, data.y)
  }

  setEntityAttributes(game, data) {
    this.id = data.id

    this.data = data
    this.container = data.container
    this.game = game
    this.sector = game.sector
    this.stage = game.app.stage

    this.w = data.w || this.getDisplayWidth()
    this.h = data.h || this.getDisplayHeight()

    if (this.sprite) {
      this.sprite.position.set(data.x, data.y)
    }

    this.initTaintable({shouldPopulate: false})
    this.effects = {}
    this.effectInstances = {}

    this.registerEntity()
  }

  isHiddenFromView() {
    return false
  }

  registerEntity() {
    if (this.id) {
      this.sector.registerGlobalEntity(this)
    }
  }

  isRPItem() {
    return false;
  }

  getRequiredRP() {
    if(!this.getConstants().requiredRP) {
      throw new Error("Must implement getRequiredRP, or add a requiredRP field in constants.json")
    }
    return this.getConstants().requiredRP
  }

  canMenuBeOpened() {
    return true
  }

  shouldSendInteractTargetToServer() {
    return !this.getConstants().shouldLimitInteractToMenuOnly
  }

  getCoord() {
    return [this.getRow(), this.getCol()].join(",")
  }

  getAngle() {
    return this.angle
  }

  getRadAngle() {
    return this.angle * (Math.PI / 180)
  }

  getEntityMenuName() {
    return i18n.t(this.getTypeName())
  }

  onHighlighted() {

  }

  belongToOwner(player) {
    if (!this.owner) return false
    if (!player) return false
      
    let isOwnedByPlayer = this.owner.id === player.id
    let isOwnedByPlayerTeam = this.owner.id === player.teamId
    return isOwnedByPlayer || isOwnedByPlayerTeam
  }

  unregisterEntity() {
    if (this.id) {
      this.sector.unregisterGlobalEntity(this)
    }
  }

  shouldShowCooldown() {
    return this.getConstants().shouldShowCooldown
  }

  isLightOn() {
    return this.isLightPersistent() || this.isOpen
  }

  isLightPersistent() {
    return this.getConstants().isLightPersistent
  }

  onNPCServerMessage(data) {

  }
  
  createChatBubble(text, options = {}) {
    let shouldRecreateChatBubble = (this.chatBubble && this.chatBubble.textSprite.text !== text) ||
                                   !this.chatBubble
    if (shouldRecreateChatBubble) {
      options.text = text
      options.entity = this

      this.chatBubble = new ChatBubble(options)
    }

    this.chatBubble.delayedRemove(5000)
    return this.chatBubble
  }


  isProducer() {
    return this.hasCategory("producer")
  }

  static isTerrain() {
    return false
  }

  isTerrain() {
    return this.constructor.isTerrain()
  }

  getTypeName(content) {
    let label = this.getConstants().label
    if (label) return label

    let type = this.getType()
    return Helper.getTypeNameById(type).replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  static getCraftTypeName(content) {
    let type = this.getType()
    return Helper.getTypeNameById(type).replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getTypeNameCamelCase(content) {
    let typeName = this.getTypeName(content)
    return typeName.replace(/\s+/g, '')
  }

  static getTypeName(content) {
    return this.prototype.getTypeName(content)
  }

  static getType() {
    return this.prototype.getType()
  }

  getDescription() {
    let description = this.getConstants().description
    if (description === this.name) return ""

    let translationKey = this.getTypeNameCamelCase() + ".Description" 

    if (i18n.has(translationKey)) {
      return i18n.t(translationKey)
    } else {
      return description || ""
    }
  }

  onClick() {
  }

  static getDescription() {
    return this.prototype.getDescription()
  }

  static getConstants() {
    return this.prototype.getConstants()
  }

  dontShowHealth() {
    return this.getConstants().dontShowHealth
  }

  isUsable() {
    return false
  }

  hasMenu() {
    return !!this.getConstants().hasMenu
  }

  shouldShowInteractTooltip() {
    return !!this.getConstants().showInteractTooltip
  }

  isInteractable() {
    return !!this.getConstants().isInteractable
  }

  closeHands() {
    this.hands.texture = PIXI.utils.TextureCache["player_hands_closed.png"]
  }

  openHands() {
    this.hands.texture = PIXI.utils.TextureCache["player_hands.png"]
  }

  getOwnershipStat(options = {}) {
    let ownerName
    if (this.unowned || !this.owner) {
      ownerName = "None"
    } else if (this.owner) {
      let team = this.game.teams[this.owner.id]
      if (team) {
        // make sure to use update team name if changed
        ownerName = team.name
      } else {
        ownerName = this.owner.name 
      }
    }

    let el = "<div class='entity_stats_entry ownership_stat_entry'>" +
                    "<div class='stats_type'>" + i18n.t("Owner") + ":</div>" +
                    "<div class='stats_value'>" + ownerName.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</div>" +
                "</div>"
    return el
  }


  showLighting(container, entityMenu) {
    let brightness   = container.lightManager.getTotalBrightness(this.getRow(), this.getCol())
    let color        = container.lightManager.computeLightValue(this.getRow(), this.getCol())

    let colorString = [color.r, color.g, color.b].join(",")

    // entityMenu.querySelector(".entity_light_brightness").innerText = "brightness:  " + brightness
    // entityMenu.querySelector(".entity_light_color").innerText = "color:  " + colorString
  }

  static getCost() {
    let requirements = this.prototype.getConstants().requirements

    let requirementsCost = 0
    for (let klassName in requirements) {
      let count = requirements[klassName]
      let klass = game.getItemKlassByName(klassName)
      let cost = klass.getCost() * count
      requirementsCost += cost
    }

    if (requirementsCost && !this.prototype.getConstants().isCostIndependent) {
      return requirementsCost
    } else {
      let cost = this.prototype.getConstants().cost
      return cost ? cost.gold : 2
    }
  }

  addEffectInstance(name, effectInstance) {
    this.effectInstances[name] = effectInstance
  }

  removeEffectInstance(name) {
    delete this.effectInstances[name]
  }

  removeSelfAndChildrens(sprite) {
    ClientHelper.removeSelfAndChildrens(sprite)
  }

  setEffects(effects) {
    // effects to remove
    for (let prevEffect in this.effects) {
      if (!effects[prevEffect]) {
        delete this.effects[prevEffect]
        this.onEffectRemoved(prevEffect)
      }
    }

    // effects to add
    for (let effect in effects) {
      let value = effects[effect]
      this.setEffectLevel(effect, value)
    }
  }

  handleDoubleClick(callback) {
    let currClickTime = (new Date()).getTime()
    let doubleClickThreshold = 500 // ms
    let isDblClick = this.lastClickTime && ((currClickTime - this.lastClickTime) < doubleClickThreshold)

    if (isDblClick) {
      callback()
    }

    this.lastClickTime = (new Date()).getTime()
  }

  renderInvalidArea() {
    const areaInvalidSprite = this.game.sector.invalidAreaSprite

    let isPositionValid = this.constructor.isPositionValid(this.container,
                                                           this.getRelativeX(),
                                                           this.getRelativeY(),
                                                           this.getRotatedWidth(),
                                                           this.getRotatedHeight(),
                                                           this.getAngle(),
                                                           this.game.player,
                                                           this.getType(),
                                                           this)

    if (isPositionValid) {
      let regionBuildPermission = this.game.sector.getRegionBuildPermission(this.getRelativeX(), this.getRelativeY(), this.getRotatedWidth(), this.getRotatedHeight())
      if (regionBuildPermission ) {
        if (!this.game.player.canBuildInRegion(regionBuildPermission)) {
          isPositionValid = false
        }
      } else {
        if (player.getRole() && !player.getRole().permissions.Build) {
          isPositionValid = false
        }
      }
    }

    if (!isPositionValid) {
      areaInvalidSprite.width = this.getAreaInvalidWidth()
      areaInvalidSprite.height = this.getAreaInvalidHeight()
      areaInvalidSprite.position.x = this.getX()
      areaInvalidSprite.position.y = this.getY()
      areaInvalidSprite.rotation = this.getRadAngle()

      areaInvalidSprite.alpha = 0.6
      this.onPositionBecomeInvalid()
    } else {
      areaInvalidSprite.alpha = 0
      this.onPositionBecomeValid()
    }
  }

  renderAtMousePosition(clientX, clientY) {
    const cameraPositionX = -this.game.cameraDisplacement.x
    const cameraPositionY = -this.game.cameraDisplacement.y
    const x = (cameraPositionX + clientX) / this.game.resolution
    const y = (cameraPositionY + clientY) / this.game.resolution

    const oldX = this.sprite.x
    const oldY = this.sprite.y
    const oldRow = Math.floor(oldY / Constants.tileSize)
    const oldCol = Math.floor(oldX / Constants.tileSize)

    this.sprite.x = this.container.getSnappedPosX(x, this.getRotatedWidth())
    this.sprite.y = this.container.getSnappedPosY(y, this.getRotatedHeight())

    const row = Math.floor(this.sprite.y / Constants.tileSize)
    const col = Math.floor(this.sprite.x / Constants.tileSize)

    if (oldX !== this.sprite.x || oldY !== this.sprite.y) {
      this.onPositionChanged()

      if (oldRow !== row || oldCol !== col) {
        this.onGridPositionChanged()
      }
    }
  }


  getAreaInvalidWidth() {
    return this.getWidth()
  }

  getAreaInvalidHeight() {
    return this.getHeight()
  }


  onPositionBecomeInvalid() {

  }

  onPositionBecomeValid() {

  }


  isBuildingType() {
    return false
  }

  isLightBlocker() {
    return this.getConstants().isLightBlocker
  }

  isLightSource() {
    if (!this.cachedLightSource) {
      this.cachedLightSource = this.getConstants().isLightSource
    }

    return this.cachedLightSource
  }

  isLightDiffuser() {
    return this.isForegroundTile()
  }

  isForegroundTile() {
    return false
  }

  getStats(level) {
    return this.getConstants().stats || {}
  }

  createRoleSelect(entityMenu) {
    let el = "<div>" +
               "<div class='player_permissions_label'>" + i18n.t('Role') + "</div>" +
               "<select class='player_permissions_select ui_select' data-member-id='" + this.id + "'>"

    for (let roleId in this.game.roles) {
      let role = this.game.roles[roleId]
      let option = "<option value='" + roleId + "'>" + i18n.t(role.name) + "</option>" 
      el += option
    }

    el += "</select></div>" 

    return el
  }

  getStandingPlatform() {
    let entity = this.getContainer().platformMap.get(this.getRow(), this.getCol())
    if (entity) return entity

    entity = this.getContainer().groundMap.get(this.getRow(), this.getCol())
    if (entity) return entity

    entity = this.getContainer().undergroundMap.get(this.getRow(), this.getCol())
    if (entity) return entity

    return null
  }

  initSprite(x, y) {
    this.sprite = this.getSprite(x, y)
    let baseSprite = this.getLightableSprites()
    // baseSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY // for blending against lightmap

    if (this.sprite.anchor) this.sprite.anchor.set(0.5)
    this.sprite.position.set(x, y)

    this.applyConstantsDefinition()

    let spriteContainer = this.getSpriteContainer()
    if (spriteContainer) {
      let childIndex = this.getChildIndex()
      if (childIndex === null) {
        spriteContainer.addChild(this.sprite)
      } else {
        spriteContainer.addChildAt(this.sprite, childIndex)
      }
      
      if (this.isInterpolatable()) {
        this.interpolator = Interpolator.mixin(this.getInterpolatableSprite())
      }
      
    } else {
      this.remove()
    }
  }

  isInterpolatable() {
    return this.sector.movableGroupSet.has(this.getGroup())
  }

  getGroup() {
    return null
  }

  getChildIndex() {
    return null
  }

  getId() {
    return this.id
  }

  applyConstantsDefinition() {
    let constantTable = this.getConstants().sprite
    if (constantTable) {
      if (constantTable.position) {
        this.sprite.position.x = constantTable.position.x
        this.sprite.position.y = constantTable.position.y
      }

      if (typeof constantTable.anchor !== "undefined") {
        this.sprite.anchor.set(constantTable.anchor)
      }

      if (typeof constantTable.rotation !== "undefined") {
        this.sprite.rotation = constantTable.rotation * PIXI.DEG_TO_RAD
      }

      if (typeof constantTable.tint !== "undefined") {
        this.sprite.tint = ClientHelper.hexToInt(constantTable.tint)
      }

      if (typeof constantTable.width !== "undefined") {
        this.sprite.width = constantTable.width
      }

      if (typeof constantTable.height !== "undefined") {
        this.sprite.height = constantTable.height
      }
    }
  }

  getInterpolatableSprite() {
    return this.sprite
  }

  getLightableSprites() {
    return [this.sprite] // default
  }

  unselect() {
    if (this.selectionSprite) {
      let parent = this.selectionSprite.parent
      if (parent) {
        this.selectionSprite.parent.removeChild(this.selectionSprite)
      }
      this.selectionSprite.destroy()
      this.selectionSprite = null
    }
  }

  renderEntityMenu(entityMenu) {
    // nothing by default
  }

  getSelectionRect() {
    return null
  }

  onMouseOver() {
    this.isMouseOver = true
  }

  onMouseOut() {
    this.isMouseOver = false
  }

  hasMouseOver() {
    return this.isMouseOver
  }

  isControlledByPlayer() {
    return this.game.player.getCameraFocusTarget() === this
  }

  getRelativeBox() {
    if (!this.ship) {
      return this.getBox(this.getX(), this.getY(), this.getWidth(), this.getHeight())
    } else {
      return this.getBox(this.getRelativeX(), this.getRelativeY(), this.getWidth(), this.getHeight())
    }
  }


  getPaddedRelativeBox(padding = Constants.tileSize) {
    let box = this.getRelativeBox()

    return {
      pos: {
        x: box.pos.x - padding,
        y: box.pos.y - padding
      },
      w: box.w + padding * 2,
      h: box.h + padding * 2
    }
  }


  getSelectionSpriteParent() {
    return this.sprite
  }

  registerToChunk() {
    let chunk = this.getChunk()

    if (this.chunk !== chunk) {
      if (this.chunk) {
        this.chunk.unregister(this.getGroup(), this)
      }

      this.chunk = chunk
      if (this.chunk) {
        this.chunk.register(this.getGroup(), this)
      }
    }
  }

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  }

  getChunkRow() {
    const chunkSize = Constants.chunkRowCount * Constants.tileSize
    return Math.floor(this.getY() / chunkSize)
  }

  getChunkCol() {
    const chunkSize = Constants.chunkRowCount * Constants.tileSize
    return Math.floor(this.getX() / chunkSize)
  }

  getUpperLeftRow() {
    let box = this.getRelativeBox()
    return Math.floor(box.pos.y / Constants.tileSize)
  }

  getUpperLeftCol() {
    let box = this.getRelativeBox()
    return Math.floor(box.pos.x / Constants.tileSize)
  }

  getRow() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.y + box.h / 2) / Constants.tileSize)
  }

  getCol() {
    let box = this.getRelativeBox()
    return Math.floor((box.pos.x + box.w / 2) / Constants.tileSize)
  }


  getRotatedWidth() {
    return this.getWidth()
  }

  getRotatedHeight() {
    return this.getHeight()
  }

  getSelectionWidth() {
    return this.getWidth()
  }

  getSelectionHeight() {
    return this.getHeight()
  }

  getSelectionLineStyle() {
    return {
      lineWidth: 4,
      color: 0xeeeeee,
      alpha: 0.7
    }
  }

  static isUsable() {
    return false
  }

  isMob() {
    return false
  }

  isMovable() {
    return false
  }

  isHangar() {
    return false
  }

  isAnimatable() {
    return this.getConstants().isAnimatable
  }

  redrawSprite() {
    // do nothing by default
  }

  getBrightness() {
    return this.getConstants().brightness || 0
  }

  static getBox(x, y, w, h) {
    return {
      pos: {
        x: x - w/2,
        y: y - h/2,
      },
      w: w,
      h: h
    }
  }

  getBox(x = this.getX(), y = this.getY(), w = this.w, h = this.h) {
    return {
      pos: {
        x: x - w/2,
        y: y - h/2,
      },
      w: w,
      h: h
    }
  }

  getSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = this.createSprite(texture)
    if (!this.shouldUseOriginalWidth()) {
      sprite.width  = this.w
      sprite.height = this.h
    }
    sprite.name = this.constructor.name

    return sprite
  }

  createSprite(texture) {
    return new PIXI.Sprite(texture)
  }

  shouldUseOriginalWidth() {
    return this.getConstants().useOriginalSize || false
  }

  setAlpha(alpha) {
    this.sprite.alpha = alpha
  }

  setScaleX(scale) {
    this.sprite.scale.x = scale
  }

  setLevel(level) {
    const prevLevel = this.level
    this.level = level

    if (this.level !== prevLevel && this.level !== 0) {
      this.onLevelIncreased()
    }
  }

  onLevelIncreased() {

  }

  instructToMove(x, y) {
    this.sprite.instructToMove(x, y)
  }

  instructToRotate(rotation) {
    this.getRotatableSprite().instructToRotate(rotation)
  }

  getRotatableSprite() {
    return this.sprite
  }

  getMeleeTarget() {
    const xp = this.getRange() * Math.cos(this.getRadAngle())
    const yp = this.getRange() * Math.sin(this.getRadAngle())

    return { x: this.getX() + xp, y: this.getY() + yp }
  }


  instructToExpand(width) {
    this.sprite.instructToExpand(width)
  }

  interpolate(lastFrameTime) {
    this.sprite.interpolate(lastFrameTime)

    if (typeof this.angle !== "undefined") {
      this.interpolateRotation(lastFrameTime)
    }
  }

  interpolateRotation(lastFrameTime) {
    this.getRotatableSprite().interpolateRotation(lastFrameTime)
  }

  getDefaultSpriteColor() {
    return 0xffffff
  }

  animateDamage() {
    if (this.hasCategory("custom_colors")) return
    if (this.spriteRestoreTimeout) return

    this.setTint(this.getTintableSprite(), 0xff6d6d) // 0x555555

    this.spriteRestoreTimeout = setTimeout(() => {
      this.setTint(this.getTintableSprite(), this.getDefaultSpriteColor())
      this.spriteRestoreTimeout = null
      // this.shieldSprite.alpha = 1
    }, 100)

  }

  getActionTooltipMessage() {
    return null
  }

  repositionOnUnitMap() {
    this.removeFromUnitMap()
    this.getContainer().unitMap.registerToCollection(this.getRelativeBox(), this)
    this.prevRelativeBox = this.getRelativeBox()
  }

  repositionOnCorpseMap() {
    this.removeFromCorpseMap()
    this.getContainer().corpseMap.registerToCollection(this.getRelativeBox(), this)
    this.prevRelativeBox = this.getRelativeBox()
  }

  getContainer() {
    return this.sector
  }

  removeFromUnitMap() {
    if (this.prevRelativeBox) {
      this.getContainer().unitMap.unregisterFromCollection(this.prevRelativeBox, this)
    }
  }

  removeFromCorpseMap() {
    if (this.prevRelativeBox) {
      this.getContainer().corpseMap.unregisterFromCollection(this.prevRelativeBox, this)
    }
  }

  setTint(spriteOrContainer, tint) {
    const isContainer = typeof spriteOrContainer.calculateVertices !== "function"
    if (isContainer) {
      spriteOrContainer.children.forEach((child) => {
        this.setTint(child, tint)
      })
    } else {
      // is sprite
      spriteOrContainer.tint = tint
    }
  }

  lightenColor(color, percent) {
    var num = parseInt(color,16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    B = (num >> 8 & 0x00FF) + amt,
    G = (num & 0x0000FF) + amt;

    return (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1)
  }

  getTintableSprite() {
    return this.sprite
  }

  getSpriteContainer() {
    return this.stage
  }

  getRequirements() {
    return Object.assign({}, this.getConstants().requirements)
  }

  setAngle(angle) {
    this.angle = angle
    this.sprite.rotation = this.getRadAngle()
  }

  remove() {
    this.unregisterEntity()

    if (this.sprite) {
      this.removeSelfAndChildrens(this.sprite)
    }

    for (let effect in this.effectInstances) {
      let effectInstance = this.effectInstances[effect]
      effectInstance.remove()
    }
  }

  getTintableSprites() {
    return [this.sprite]
  }

  removeChildrens(sprite) {
    while(sprite.children[0]) {
      sprite.removeChild(sprite.children[0])
    }
  }

  isCorpse() {
    return false
  }

  isPlayer() {
    return false
  }

  getCollisionGroup() {
    return null
  }

  addDizzyEyes(targetSprite) {
    if (!this.dizzySprite) {
      this.dizzySprite = new PIXI.Sprite(PIXI.utils.TextureCache["dizzy_eyes.png"])
      this.dizzySprite.width  = 30
      this.dizzySprite.height = 12
      this.dizzySprite.anchor.set(0.5)
      targetSprite.addChild(this.dizzySprite)
    }
  }

  removeDizzyEyes() {
    if (this.dizzySprite) {
      this.dizzySprite.parent.removeChild(this.dizzySprite)
      this.dizzySprite = null
    }
  }

  resurrectBody() {
    this.removeDizzyEyes()
  }

  getTiles() {
    return [{ row: this.getRow(), col: this.getCol() }]
  }

  getSleepTween() {
    const firstSleepText = BitmapText.create({
      label: "SleepText",
      text: "Z", 
      align: 'center',
      spriteContainer: this.sleepStatusContainer
    })

    firstSleepText.sprite.alpha = 0

    const secondSleepText = BitmapText.create({
      label: "SleepText",
      text: "Z", 
      align: 'center',
      spriteContainer: this.sleepStatusContainer
    })

    secondSleepText.sprite.alpha = 0

    let launcher = new TWEEN.Tween({}).to({}, 0).onUpdate(() => {})
    launcher.onStop(() => {
      firstSleepText.remove()
      secondSleepText.remove()
    })

    let delay = 1000
    const firstSleepPositionTween = this.getPositionTween(firstSleepText.sprite, 0, Constants.tileSize, delay)
    const secondSleepPositionTween = this.getPositionTween(secondSleepText.sprite, 0, Constants.tileSize)
    firstSleepPositionTween.chain(launcher)

    launcher.chain(firstSleepPositionTween, secondSleepPositionTween)

    return launcher
  }

  getPositionTween(sprite, start, end, delay = 0) {
    let offset = { offset: start }

    return new TWEEN.Tween(offset)
        .to({ offset: end }, 3000)
        .onStart(() => {
          sprite.alpha = 0.8
        })
        .onUpdate(() => {
          sprite.position.x = offset.offset
          sprite.position.y = -(offset.offset*2)
          sprite.width = Math.max(12, Math.min(25, offset.offset))
          sprite.height = Math.max(12, Math.min(25, offset.offset))
        })
        .onComplete(() => {
          offset.offset = start
          sprite.alpha = 0
        })
        .delay(delay)
  }

  showSleepAnimation() {
    if (!this.sleepTween) {
      this.sleepTween = this.getSleepTween()
    }

    this.sleepTween.start()
  }

  hideSleepAnimation() {
    if (this.sleepTween) {
      this.sleepTween.stop()
      this.sleepTween = null
    }

    this.sleepStatusContainer.removeChildren()
  }


  getDisplayWidth() {
    let constantTable = this.getConstants().sprite
    if (constantTable && constantTable.width) {
      return constantTable.width
    } else {
      return this.getWidth()
    }
  }

  getDisplayHeight() {
    let constantTable = this.getConstants().sprite
    if (constantTable && constantTable.height) {
      return constantTable.height
    } else {
      return this.getHeight()
    }
  }

  animateHungerDecreased(delta) {
    const duration = 1500
    const yLength  = 50

    const message = '- ' + delta + ' hunger'

    const hungerText = BitmapText.create({
      label: "HungerText",
      text: message,
      size: 21,
      spriteContainer: this.game.sector.effectsContainer
    })

    hungerText.sprite.tint = 0xeeeeee

    let dimensions = {
      x: this.getX(),
      y: this.getY() - this.getHeight(),
      size: 64
    }

    hungerText.sprite.position.set(dimensions.x, dimensions.y)

    new TWEEN.Tween(dimensions) 
        .to({ x: dimensions.x, y: dimensions.y - yLength, size: 32 }, duration) 
        .easing(TWEEN.Easing.Quadratic.Out) 
        .onUpdate(() => { 
          hungerText.sprite.position.y = dimensions.y
          // sprite.width  = dimensions.size + 20
          // sprite.height = dimensions.size
        })
        .onComplete(() => {
          hungerText.remove()
        }) 
        .start()
  }


  isMovingEntity() {
    return this.isPlayer() || this.isMob()
  }

  getWidth() {
    return this.getConstants().width
  }

  getHeight() {
    return this.getConstants().height
  }


  static getConstantsTable() {
    return this.prototype.getConstantsTable()
  }

  getSpritePath() {
    let table = this.getConstants()
    if (table.sprite && table.sprite.path) {
      return table.sprite.path + ".png"
    }

    throw this.getTypeName() + " must implement getSpritePath"
  }

  getYScale() {
    return 1
  }

  getXScale() {
    return 1
  }

  getX() {
    return this.sprite.x
  }

  getY() {
    return this.sprite.y
  }

  getEffectInstance(name) {
    return this.effectInstances[name]
  }

}

Object.assign(BaseEntity.prototype, Definable.prototype, {
})

Object.assign(BaseEntity.prototype, Categorizable.prototype, {
})

Object.assign(BaseEntity.prototype, Taintable.prototype, {
  onEffectAdded(effect) {
    let klass = Effects.forName(effect)
    if (klass) {
      new klass(this)
    }
  },
  onEffectRemoved(effect) {
    const effectInstance = this.getEffectInstance(effect)
    if (effectInstance) {
      effectInstance.remove()
    }
  },
  onEffectLevelChanged(effect, level) {
    const effectInstance = this.getEffectInstance(effect)
    if (effectInstance) {
      effectInstance.onLevelChanged(level)
    }
  }
})


module.exports = BaseEntity
