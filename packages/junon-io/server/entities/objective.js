const SocketUtil = require("junon-common/socket_util")

class Objective {
  constructor(sector, options = {}) {
    this.sector = sector
    this.game = this.sector.game

    this.name = options.name
    this.description = options.description || ""
    this.trigger = options.trigger

    this.translations = {}
    if (options.description_ja) {
      this.translations["ja"] = options.description_ja
    }

    this.onObjectiveAssigned = options.onObjectiveAssigned

    this.isCompleted = false

    this.register()

    this.player = null
  }

  isForRole(role) {
    if (!this.player) return false
    return this.player.getRole() && this.player.getRole().name === role
  }

  assignTo(player) {
    this.player = player
    player.assignObjective(this)
    this.initTrigger()
  }

  isAssigned() {
    return this.player
  }

  remove() {
    this.isRemoved = true
    this.unregister()
  }

  initTrigger() {
    let params = {
      objectivePlayerId: this.player.getId()
    }

    this.trigger.objective = {
      params: params
    }

    if (this.onObjectiveAssigned) {
      this.onObjectiveAssigned.commands.forEach((command) => {
        let newCommand = this.sector.eventHandler.interpolate(command, params)
        this.game.executeCommand(this.sector, newCommand)
      })
    }

    this.sector.eventHandler.addTrigger(this.trigger)
  }

  register() {
    this.sector.objectives[this.name] = this
  }

  unregister() {
    delete this.sector.objectives[this.name] 
  }

  setDescription(description) {
    this.description = description
  }

  setComplete() {
    if (this.isRemoved) return

    this.isCompleted = true

    this.game.triggerEvent("ObjectiveCompleted", { name: this.name })

    SocketUtil.emit(this.player.getSocket(), "Objective", { name: this.name, isCompleted: true })
  }

}

module.exports = Objective