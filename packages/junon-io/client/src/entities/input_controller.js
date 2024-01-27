const SocketUtil = require("../util/socket_util")
const Constants = require('../../../common/constants.json')
const Helper = require('../../../common/helper')
const Buildings = require('./buildings/index')
const Nipplejs = require('nipplejs')
const ClientHelper = require("../util/client_helper")
const isMobile = require('ismobilejs')

class InputController {
  constructor(player, game) {
    this.player = player
    this.player.inputController = this
    this.game = game
    this.main = game.main

    this.initConstants()
    this.initVariables()
    this.initListeners()

    if (this.isMobile()) {
      this.initMobile()
    }
    
  }

  setPlayer(player) {
    this.player = player
    this.player.inputController = this
  }

  initMobile() {
    document.querySelector("#mobile_action_menu").style.display = 'block'
    
    const options = { 
      zone: document.getElementById('gamepad_joystick'), 
      mode: 'static',
      position: {left: '50px', bottom: '50px'} 
    }
    this.joystick = Nipplejs.create(options)
    this.joystick.on("move", this.onJoystickMove.bind(this))
    this.joystick.on("end", this.onJoystickEnd.bind(this))
  }

  onJoystickMove(event, data) {
    this.idle = false
    this.moveAngle = 360 - data.angle.degree

    this.player.setAngle(this.moveAngle)
  }

  onJoystickEnd(event, data) {
    this.idle = true
  }

  initConstants() {
    this.KEY_EVENT_TYPES = {
      down: 0,
      up: 1
    }

  }

  initVariables() {
    this.canvas = document.getElementById("game_canvas")
    this.controlKeys = 0
    this.heldKeys = {}

    this.inputSequenceNumber = 0
    this.moveAngle = 0
    this.idle = true
    this.allowEnter = true
  }

  reset() {
    this.initVariables()
  }

  initListeners() {
    this.keyDownHandler   = this.globalKeyDownHandler.bind(this)
    this.keyUpHandler     = this.globalKeyUpHandler.bind(this)
    this.mouseDownHandler = this.globalMouseDownHandler.bind(this)
    this.mouseUpHandler   = this.globalMouseUpHandler.bind(this)
    this.mouseMoveHandler = this.globalMouseMoveHandler.bind(this)

    document.addEventListener("keydown", this.keyDownHandler, true)
    document.addEventListener("keyup", this.keyUpHandler, true)
    document.addEventListener("mousemove", this.mouseMoveHandler, true)

    if (isMobile.any) {
      document.addEventListener("touchstart", this.mouseDownHandler, true)
      document.addEventListener("touchend", this.mouseUpHandler, true)
    } else {
      document.addEventListener("mousedown", this.mouseDownHandler, true)
      document.addEventListener("mouseup", this.mouseUpHandler, true)
    }

    if (this.isMobile()) {
      this.mobilePrimaryActionTouchStartHandler = this.onMobilePrimaryActionTouchStart.bind(this)
      this.mobilePrimaryActionTouchEndHandler = this.onMobilePrimaryActionTouchEnd.bind(this)

      if (isMobile.any) {
        document.querySelector("#mobile_primary_action_btn").addEventListener("touchstart", this.mobilePrimaryActionTouchStartHandler, true)
        document.querySelector("#mobile_primary_action_btn").addEventListener("touchend",   this.mobilePrimaryActionTouchEndHandler,   true)
      } else {
        document.querySelector("#mobile_primary_action_btn").addEventListener("mousedown", this.mobilePrimaryActionTouchStartHandler, true)
        document.querySelector("#mobile_primary_action_btn").addEventListener("mouseup",   this.mobilePrimaryActionTouchEndHandler,   true)
      }

      this.mobileActionTouchStartHandler = this.onMobileActionTouchStart.bind(this)
      this.mobileActionTouchEndHandler = this.onMobileActionTouchEnd.bind(this)

      if (isMobile.any) {
        document.querySelector("#mobile_action_btn").addEventListener("touchstart", this.mobileActionTouchStartHandler, true)
        document.querySelector("#mobile_action_btn").addEventListener("touchend",   this.mobileActionTouchEndHandler,   true)
      } else {
        document.querySelector("#mobile_action_btn").addEventListener("mousedown", this.mobileActionTouchStartHandler, true)
        document.querySelector("#mobile_action_btn").addEventListener("mouseup",   this.mobileActionTouchEndHandler,   true)
      }
    }
  }

  removeListeners() {
    document.removeEventListener("keydown", this.keyDownHandler, true)
    document.removeEventListener("keyup", this.keyUpHandler, true)
    document.removeEventListener("mousedown", this.mouseDownHandler, true)
    document.removeEventListener("mouseup", this.mouseUpHandler, true)
    document.removeEventListener("touchstart", this.mouseDownHandler, true)
    document.removeEventListener("touchend", this.mouseUpHandler, true)
    document.removeEventListener("mousemove", this.mouseMoveHandler, true)

    if (this.isMobile()) {
      document.querySelector("#mobile_primary_action_btn").removeEventListener("touchstart", this.mobilePrimaryActionTouchStartHandler, true)
      document.querySelector("#mobile_primary_action_btn").removeEventListener("touchend",   this.mobilePrimaryActionTouchEndHandler,   true)
      document.querySelector("#mobile_primary_action_btn").removeEventListener("mousedown", this.mobilePrimaryActionTouchStartHandler, true)
      document.querySelector("#mobile_primary_action_btn").removeEventListener("mouseup",   this.mobilePrimaryActionTouchEndHandler,   true)

      document.querySelector("#mobile_action_btn").removeEventListener("touchstart", this.mobileActionTouchStartHandler, true)
      document.querySelector("#mobile_action_btn").removeEventListener("touchend",   this.mobileActionTouchEndHandler,   true)
      document.querySelector("#mobile_action_btn").removeEventListener("mousedown", this.mobileActionTouchStartHandler, true)
      document.querySelector("#mobile_action_btn").removeEventListener("mouseup",   this.mobileActionTouchEndHandler,   true)
    }
  }

  onMobileActionTouchStart() {
    let entity = this.game.sector.selection.selectedEntity

    if (entity && entity.isBuildingType() && entity.isInteractable()) {
      this.game.interact(entity)
    } else if (this.player.hasMineTarget()) {
      this.player.toggleMiningMode()
    } else if (game.getHighlightedEntity()) {
      game.interact(game.getHighlightedEntity())
    } else if (this.player.getMount()) {
      this.game.interact(this.player.getMount()) // to allow mobile unmount
    } else {
      
    }
  }

  onMobilePrimaryActionTouchStart() {
    this.isPerformingMobileAction = true
  }

  onMobilePrimaryActionTouchEnd() {
    this.isPerformingMobileAction = false
  }

  onMobileActionTouchEnd() {

  }

  handleEnter() {
    if (!this.game.chatMenu.isOpenAndFocused()) {
      if (this.game.sector.shouldShowChat()) {
        this.game.chatMenu.open({ message: this.game.chatMenu.chatInput.value })
      }
    } else {
      this.game.chatMenu.submit()
    }
  }

  handleEsc() {
    if (this.main.gameExplorer && this.main.gameExplorer.isAttachedToBody) {
      this.main.gameExplorer.attachToMiddleContainer()
      return
    }

    if (this.game.chatMenu.isOpen()) {
      this.game.chatMenu.chatInput.blur()
      if (this.game.sector.shouldShowChat()) {
        this.game.chatMenu.close()
      } else if (!this.game.voteMenu.isOpen()) {
        this.game.chatMenu.hide()
      }
      return
    }

    // if (this.game.openMenus.length === 0 && this.player.getActiveItem()) {
    //   this.player.requestEquipChange(-1) // cancel hotbar active item
    //   return
    // }

    this.game.clearRegion()
    this.game.resetEntitySelection()

    if (game.openMenus.length > 0) {
      this.game.closeLastMenu()
      return
    }

    if (this.game.isActive) {
      if (this.isInGameMenuOpen()) {
        this.game.closeInGameMenu() 
      } else {
        this.game.openInGameMenu() 
      }
    }
  }

  isFocusedOnInput(event) {
    // https://stackoverflow.com/a/16508083
    let obj = event.target
    if (obj.type === 'textarea') return true

    return obj instanceof HTMLInputElement && (obj.type == 'text' || obj.type == 'number')
  }

  convertKeyToControl(keyCode) {
    if (keyCode === 38) return Constants.Control.up
    if (keyCode === 37) return Constants.Control.left
    if (keyCode === 40) return Constants.Control.down
    if (keyCode === 39) return Constants.Control.right

    if (this.game.keyBindings["move up"] === keyCode) return Constants.Control.up    
    if (this.game.keyBindings["move left"] === keyCode) return Constants.Control.left    
    if (this.game.keyBindings["move down"] === keyCode) return Constants.Control.down    
    if (this.game.keyBindings["move right"] === keyCode) return Constants.Control.right    
    if (this.game.keyBindings["attack"] === keyCode) return Constants.Control.space
  }

  globalKeyUpHandler(event) {
    if (this.game.isActive && this.isInGameMenuOpen()) {
      if (event.keyCode === 27) {
        this.game.closeInGameMenu()  
      }
      return
    }

    let keyCode = ClientHelper.getKeycode(event)
    delete this.heldKeys[keyCode]

    if (this.isFocusedOnInput(event)) return

    const control = this.convertKeyToControl(keyCode)

    if (control) {
      this.controlKeys ^= control

      if (this.controlKeys === 0) {
        this.moveAngle = 0
      }
    } else {
      if (keyCode === 9) { // tab 
        if (game.isModalMenuOpen()) {
          if (this.heldKeys[16]) { //shift
            game.onMenuInteract("ShiftTab")
          } else {
            game.onMenuInteract("Tab")
          }
        }
      }

      if (event.keyCode === 27) { // escape
        this.handleEsc()
      }

      if (event.keyCode === this.game.keyBindings["rotate"]) { // R
        if (player.building) player.building.rotateEquip()
      }

      if (keyCode === this.game.keyBindings["inventory"]) { // i
        game.toggleInventory()
      } 

      if (keyCode === this.game.keyBindings["colony"]) { // p
        game.toggleTeamMenu()
      } 

      if (keyCode === this.game.keyBindings["stats view"]) { // f5
        game.togglePerformanceDebug()
      } 

      if (keyCode === this.game.keyBindings["camera mode"]) { // f6
        game.toggleMainMenus()
      } 

      if (keyCode === 121) { // f10
        if (debugMode) {
          game.toggleAdminMode()
        }
      }

      if (keyCode === this.game.keyBindings["interact"]) { // e
        let highlightedEntity = game.getHighlightedEntity()
        if (highlightedEntity) {
          game.interact(highlightedEntity)
        } else {
          game.interactEmpty()
        }
      } 

      if (keyCode === this.game.keyBindings["zoom out"]) { // -
        if (game.isModalMenuOpen()) {
          game.onMenuInteract("GoUp")
        } else {
          game.zoomOut()
        }
      } 

      if (keyCode === this.game.keyBindings["zoom in"] ||
          keyCode === 186) { // = or ;
        if (game.isModalMenuOpen()) {
          game.onMenuInteract("GoDown")
        } else {
          game.zoomIn()
        }
      } 

      if (keyCode === this.game.keyBindings["craft"] || keyCode === 66) { // c or b
        game.toggleBlueprintMenu()
      } 

      if (keyCode === this.game.keyBindings["map"]) { // m
        game.toggleMapMenu()
      } 

      if (keyCode === this.game.keyBindings["upgrade"]) { // u
        game.upgradeSelectedEntity()
      } 

      if (keyCode === this.game.keyBindings["chat"]) { // z
        game.toggleChatMenu()
      } 

      if (keyCode === this.game.keyBindings["alliance"]) { // f
        game.toggleFriendsMenu()
      } 

      if (keyCode === this.game.keyBindings["visit"]) { // v
        game.toggleVisitColonyMenu()
      } 

      if (keyCode === this.game.keyBindings["command block"]) { // K
        game.toggleCommandBlockMenu()
      } 

      if (keyCode === 81) { // q
        game.toggleTutorial()
      } 

      if (keyCode === 191) { // /
        if (!this.game.chatMenu.isOpenAndFocused()) {
          this.game.chatMenu.open({ message: "/" })
        }
      } 

      if (keyCode === 13 ) { // enter
        if (game.isModalMenuOpen()) {
          this.allowEnter = true
          game.onMenuInteract("EnterUp")
        } else {
          this.handleEnter()
        }
      } 

      if (event.keyCode === 192) {  // backquote
        const mousePos = this.game.app.renderer.plugins.interaction.mouse.global
        const absolutePos  = {
          x: -this.game.cameraDisplacement.x + mousePos.x,
          y: -this.game.cameraDisplacement.y + mousePos.y
        }
        SocketUtil.emit("SpawnMob", absolutePos)
      }

    }

    let numberKeys = [49,50,51,52,53,54,55,56]
    if (numberKeys.indexOf(event.keyCode) !== -1) {
      this.setEquipIndex(event)
    }
  }

  getGlobalMousePos() {
    const mousePos = this.game.app.renderer.plugins.interaction.mouse.global
    const resolution = this.game.resolution

    const absolutePos  = {
      x: Math.floor((-this.game.cameraDisplacement.x + mousePos.x) / resolution),
      y: Math.floor((-this.game.cameraDisplacement.y + mousePos.y) / resolution)
    }
    
    return absolutePos
  }

  getGlobalMouseRow(globalMousePos) {
    return Math.floor(globalMousePos.y / Constants.tileSize)
  }

  getGlobalMouseCol(globalMousePos) {
    return Math.floor(globalMousePos.x / Constants.tileSize)
  }

  setEquipIndex(event) {
    let oneBasedIndex = parseInt(event.key)
    if (isNaN(oneBasedIndex)) return

    let index = oneBasedIndex - 1

    let isDifferentEquipIndex = this.player.equipIndex !== index
    if (isDifferentEquipIndex) {
      this.player.requestEquipChange(index)
    } else {
      this.player.requestEquipChange(-1) // unequip
    }
      
  }


  globalKeyDownHandler(event) {
    if (this.isFocusedOnInput(event)) return
    if (this.isInGameMenuOpen()) return
    if (this.game.chatMenu.isOpenAndFocused()) return

    let keyCode = ClientHelper.getKeycode(event)
    this.heldKeys[keyCode] = true

    this.pressedKey = keyCode

    const controlTarget = this.player

    const control = this.convertKeyToControl(keyCode)
    if (control) {
      this.controlKeys |= control
    }

    if (keyCode === this.game.keyBindings["attack"]) { // space
      if (this.player.hasMineTarget() ) {
        this.player.toggleMiningMode()
      }
    }


    if (keyCode === 116) { // f5
      // dont allow refresh (its used to show debug)
      event.preventDefault()
    }

    if(keyCode == 191) {
      //Firefox opens find box when / pressed
      event.preventDefault()
    }

    if (keyCode === 9) { // tab
      event.preventDefault()
    } else if (keyCode === 13) { // enter
      if (this.allowEnter) {
        if (game.isModalMenuOpen()) {
          game.onMenuInteract("EnterDown")
        }

        this.allowEnter = false
      }
    }
  }

  isDirectionHeld() {
    const leftHeld  = this.controlKeys & Constants.Control.left
    const rightHeld = this.controlKeys & Constants.Control.right
    const upHeld    = this.controlKeys & Constants.Control.up
    const downHeld  = this.controlKeys & Constants.Control.down

    return leftHeld || rightHeld || upHeld || downHeld
  }

  getMoveAngle() {
    const leftHeld  = this.controlKeys & Constants.Control.left
    const rightHeld = this.controlKeys & Constants.Control.right
    const upHeld    = this.controlKeys & Constants.Control.up
    const downHeld  = this.controlKeys & Constants.Control.down

    const direction = {
      x: Math.sign(rightHeld - leftHeld),
      y: Math.sign(upHeld  - downHeld),
    }

    return Math.atan2(direction.y, direction.x)
  }

  globalMouseUpHandler(event) {
    this.controlKeys &= ~Constants.Control.space // remove space key

    this.isPerformingMobileAction = false
  }

  isRightClick(event) {
    let isRightClick = false

    if ("which" in event) {
      // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
      isRightClick = event.which == 3
    } else if ("button" in event) {
      // IE, Opera 
      isRightClick = event.button == 2 

    } 
        
    return isRightClick
  }

  getUIButton(e) {
    let clientX = (e.touches && e.touches[0].clientX) || e.clientX 
    let clientY = (e.touches && e.touches[0].clientY) || e.clientY

    let buildActionMenu = this.game.buildActionMenu
    if (buildActionMenu.alpha === 0) return false

    if (this.isUIButtonHit(this.game.confirmBtn, clientX, clientY)) {
      return this.game.confirmBtn
    }

    if (this.isUIButtonHit(this.game.rotateBtn, clientX, clientY)) {
      return this.game.rotateBtn
    }

    if (this.isUIButtonHit(this.game.cancelBtn, clientX, clientY)) {
      return this.game.cancelBtn
    }

    return null
  }

  isUIButtonHit(displayObject, clientX, clientY) {
    let rectange = displayObject.getBounds()
    return Helper.testBoxPoint(rectange.x, rectange.y, rectange.width, rectange.height, clientX, clientY)
  }

  globalMouseDownHandler(e) {
    if (this.game.securityCameraMenu.isOpen()) return
      
    if (this.isMobile()) {
      let uiBtn = this.getUIButton(e)
      if (uiBtn) {
        uiBtn.onBtnClicked()
        return
      } else {
        this.lastClientX = e.touches[0].clientX
        this.lastClientY = e.touches[0].clientY
      }
    }

    // close tooltip
    if (!e.target.closest("#chat_player_tooltip")) {
      document.querySelector("#chat_player_tooltip").style.display = 'none'
    }

    let isCanvasTarget = e.target.id === "game_canvas"
    let chatContainer = e.target.closest("#chat_container")
    let isChatOverlay = chatContainer && !chatContainer.classList.contains("chat_mode")
    let allowGameMouseDown = isCanvasTarget || isChatOverlay
    if (!allowGameMouseDown) return
    
    let options = {
      isRightClick: this.isRightClick(e)
    }

    if (this.isDesktop() && isCanvasTarget) {
      if (this.game.holdItemInventorySlot) {
        this.game.throwHoldItem()
      }
    }
    
    if (options.isRightClick) {
      this.player.stopBuilding() // unequip
    } else {
      this.controlKeys |= Constants.Control.space
    }

    if (this.player.hasMineTarget() && !this.isMobile()) {
      // in mobile, mining mode is explicitly toggled
      this.player.toggleMiningMode()
    }

    if (this.isMobile()) {
      // if (!e.touches) return
      let clientX = (e.touches && e.touches[0].clientX) || e.clientX 
      let clientY = (e.touches && e.touches[0].clientY) || e.clientY

      if (!this.player.hasMineTarget()) {
        this.player.setMiningMode(false)
      }

      if (this.player.isBuilding()) {
        this.player.building.renderAtMousePosition(clientX, clientY)
        this.game.buildActionMenu.position.x = clientX 
        this.game.buildActionMenu.position.y = clientY + 64

        this.game.buildActionMenu.alpha = 1
      }
      
      let globalMousePos = this.getGlobalMousePosFromXY(clientX, clientY)
      let globalMouseRow = Math.floor(globalMousePos.y / Constants.tileSize)
      let globalMouseCol = Math.floor(globalMousePos.x / Constants.tileSize)

      if (!this.player.dragTargetId) {
        // only if not dragging someone
        this.triggerEntityMouseEvents(globalMouseRow, globalMouseCol, globalMousePos)
      }
      
      this.makePlayerFaceClickedPoint(clientX, clientY)
    }

    // in mobile, we need to make sure triggerMouseEvents get called first
    // before calling this one
    if (this.lastMouseOverEntity) {
      this.lastMouseOverEntity.onClick(options)
      if (this.lastMouseOverEntity.isBuildingType() && player.hasMiningEquipment()) {
        // for salvaging (maybe refactor in future)
        this.isPerformingMobileAction = true
      }
    } else {
      this.game.resetEntitySelection()
    }

    if (this.game.isSelectingRegion()) {
      if (!this.game.hasRegionStart()) {
        this.game.setRegionStart() 
      } else {
        this.game.createRegion() 
      }
    }

  }

  makePlayerFaceClickedPoint(clientX, clientY) {
    const relativeX = clientX - this.canvas.width / 2
    const relativeY = clientY - this.canvas.height / 2

    let angle = Math.atan2(relativeY, relativeX)
    let deg = Math.floor(angle * (180 / Math.PI))

    this.player.setAngle(deg)
  }

  getGlobalMousePosFromXY(clientX, clientY) {
    const cameraPositionX = -this.game.cameraDisplacement.x
    const cameraPositionY = -this.game.cameraDisplacement.y

    const absolutePos  = {
      x: Math.floor((cameraPositionX + clientX) / this.game.resolution),
      y: Math.floor((cameraPositionY + clientY) / this.game.resolution)
    }

    return absolutePos
  }

  isMobile() {
    return this.game.main.isMobile
  }

  isInGameMenuOpen() {
    return document.querySelector("#welcome_container").style.display === 'block'
  }

  globalMouseMoveHandler(e) {
    this.lastClientX = e.clientX * this.game.getPixelRatio()
    this.lastClientY = e.clientY * this.game.getPixelRatio()

    if (!this.game.isConnected()) return
    if (this.isInGameMenuOpen()) return
    if (!this.game.player) return
    if (this.game.player.isDestroyed()) return

    const relativeX = e.clientX * this.game.getPixelRatio() - this.canvas.width / 2
    const relativeY = e.clientY * this.game.getPixelRatio() - this.canvas.height / 2

    if (this.isDesktop() && this.player.canChangeAngle()) {
      let angle = Math.atan2(relativeY, relativeX)
      let deg = Math.floor(angle * (180 / Math.PI))

      this.player.setAngle(deg)

      let globalMousePos = this.getGlobalMousePos()
      let globalMouseRow = this.getGlobalMouseRow(globalMousePos)
      let globalMouseCol = this.getGlobalMouseCol(globalMousePos)
      let data = { angle: deg }

      if (this.lastGlobalMouseRow !== globalMouseRow) {
        data.row = globalMouseRow
        this.lastGlobalMouseRow = globalMouseRow
      }

      if (this.lastGlobalMouseCol !== globalMouseCol) {
        data.col = globalMouseCol
        this.lastGlobalMouseCol = globalMouseCol
      }

      SocketUtil.emit("PlayerTarget", data)
    }

    if (this.isDesktop() && !this.game.player.isControllingGhost()) {
      if (this.game.holdItemInventorySlot) {
        this.game.renderHoldItemAtMousePosition(e.clientX, e.clientY)
      }

      if (this.player.building && !this.game.isDragging) {
        this.player.building.renderAtMousePosition(e.clientX * this.game.getPixelRatio(), e.clientY * this.game.getPixelRatio())
      }

      let globalMousePos = this.getGlobalMousePos()
      let globalMouseRow = Math.floor(globalMousePos.y / Constants.tileSize)
      let globalMouseCol = Math.floor(globalMousePos.x / Constants.tileSize)

      this.triggerEntityMouseEvents(globalMouseRow, globalMouseCol, globalMousePos)
    }

    if (this.game.isSelectingRegion()) {
      this.game.renderRegionBlockAtMousePosition(e.clientX * this.game.getPixelRatio(), e.clientY * this.game.getPixelRatio())
    }

    if (this.game.isChunkDisplayEnabled) {
      this.game.showChunk(e.clientX * this.game.getPixelRatio(), e.clientY * this.game.getPixelRatio())
    }
  }

  isDesktop() {
    return !this.isMobile()
  }

  triggerEntityMouseEvents(globalMouseRow, globalMouseCol, globalMousePos) {
    if (this.game.isModalMenuOpen()) return
    if (!this.game.player) return

    globalMousePos = globalMousePos || this.getGlobalMousePos()
    globalMouseRow = globalMouseRow || this.getGlobalMouseRow(globalMousePos)
    globalMouseCol = globalMouseCol || this.getGlobalMouseCol(globalMousePos)

    let entity = this.game.sector.pick(globalMouseRow, globalMouseCol, globalMousePos)
    if (!entity) {
      if (this.lastMouseOverEntity) {
        this.lastMouseOverEntity.onMouseOut()
        this.lastMouseOverEntity = null
      }
    } else if (entity !== this.lastMouseOverEntity) {
      if (this.lastMouseOverEntity) {
        this.lastMouseOverEntity.onMouseOut()
      }

      entity.onMouseOver()
      
      this.lastMouseOverEntity = entity
    }
  }

}

module.exports = InputController
