class SceneAction {
  constructor(scene, options = {}) {
    this.scene = scene
    this.game = scene.game

    this.id = this.game.generateId("sceneAction") 

    this.command = options.command
    this.secondsTimestamp = options.secondsTimestamp
  }

  isPlayer() {
    return false
  }

  execute() {
    let command = this.command

    if (this.scene.playOptions)  {
      command = this.interpolate(command, this.scene.playOptions)
    }
    // console.log("scene executes: " + command)
    this.game.executeCommand(this.game.sector, command)
  }

  interpolate(command, params) {
    if (!params) return command

    let result = command
    for (let key in params) {
      let value = params[key]
      result = result.replace("{" + key + "}", value)
    }

    return result
  }
}

module.exports = SceneAction