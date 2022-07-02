class Trigger {
  constructor(eventHandler, data) {
    this.eventHandler = eventHandler
    this.game = eventHandler.game
    this.id = this.game.generateId("trigger")

    this.objective = data.objective

    this.event = data.event
    this.actions = data.actions

    this.register()
  }

  register() {
    this.eventHandler.triggers[this.event] = this.eventHandler.triggers[this.event] || {}
    this.eventHandler.triggers[this.event][this.id] = this
  }

  

}

module.exports = Trigger