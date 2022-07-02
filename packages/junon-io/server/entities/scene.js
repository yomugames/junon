const Helper = require('../../common/helper')
const SceneAction = require("./scene_action")
const Constants = require('../../common/constants.json')

class Scene {
  constructor(game, name) {
    this.game = game
    this.name = name
    this.sector = game.sector

    this.timeline = {}
    this.seconds = 0

    this.register()
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  setCamera(object) {
    if (object.hasOwnProperty("row")) {
      object.x = object.col * Constants.tileSize
      object.y = object.row * Constants.tileSize

      object.getX = function() {
        return object.col * Constants.tileSize
      }

      object.getY = function() {
        return object.row * Constants.tileSize
      }
    }
    this.camera = object
  }

  addAction(options = {}) {
    this.timeline[options.secondsTimestamp] = this.timeline[options.secondsTimestamp] || {}

    let action = new SceneAction(this, options)
    this.timeline[options.secondsTimestamp][action.id] = action
  }

  rename(name) {
    if (this.game.scenes[name]) return

    this.unregister()
    this.name = name
    this.register()

    return true
  }

  prettyPrint() {
    return ""
  }

  register() {
    this.game.scenes[this.name] = this
  }

  unregister() {
    delete this.game.scenes[this.name]
  }

  play(options = {}) {
    this.origFovMode = this.sector.settings["isFovMode"]
    this.sector.editSetting("isFovMode", false)

    if (options.camera) {
      let entity = this.game.getEntity(options.camera)
      if (entity) {
        this.camera = entity
      } else {
        let row = parseInt(options.camera.split("-")[0])
        let col = parseInt(options.camera.split("-")[1])
        if (!isNaN(row) && !isNaN(col) && !this.sector.isOutOfBounds(row, col)) {
          this.camera = { row: row, col: col, isPositionBased: true }
        }
      }
    }

    this.playOptions = options

    this.isFinished = false
    this.startTimestamp = this.game.timestamp
    this.game.setActiveScene(this)

    this.game.forEachPlayer((player) => {
      this.sendCameraTargetToClient(player)
      player.setCameraFocusTarget(this.camera)
      this.getSocketUtil().emit(player.getSocket(), "StartScene", { name: this.name })
    })
  }

  executeTurn() {
    if (this.isFinished) return

    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    // let relativeTimestamp = this.game.timestamp - this.startTimestamp
    // let seconds = Math.floor(relativeTimestamp / Constants.physicsTimeStep)

    // console.log(`scene: ${this.name} seconds: ${this.seconds}`)

    let actions = this.timeline[this.seconds]
    if (actions) {
      for (let id in actions) {
        let sceneAction = actions[id]
        sceneAction.execute()
      }
    }

    if (this.seconds >= this.duration) {
      this.onFinished()
      this.seconds = 0
    } else {
      this.seconds += 1
    }
  }

  // tell client about cameraTarget, so it can grab id,x,y later on
  sendCameraTargetToClient(player) {
    if (this.camera.isPositionBased) return

    let entityData = {}

    entityData[this.camera.getEntityGroup] = {}
    entityData[this.camera.getEntityGroup][this.camera.getId()] = this.camera

    this.getSocketUtil().emit(player.getSocket(), "EntityUpdated", entityData)
  }

  onFinished() {
    this.sector.editSetting("isFovMode", this.origFovMode)

    this.isFinished = true
    this.game.setActiveScene(null)

    this.game.forEachPlayer((player) => {
      player.resetCameraFocusTarget()
      this.getSocketUtil().emit(player.getSocket(), "EndScene", { name: this.name })
      if (this.sector.settings["isFovMode"]) {
        if (!player.isDestroyed()) {
          player.assignFov()
        }
      }
    })

    this.game.triggerEvent("scene:" + this.name + ":end")
  }

  setDuration(duration) {
    this.duration = duration
  }

  remove() {
    this.unregister()
  }
}

module.exports = Scene
