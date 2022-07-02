const Node = require("./node")
const ActionContainer = require('./action_container')
const Constants = require('../../common/constants.json')

class Trigger extends Node {
  static create(commandBlock, data) {
    if (!this.isValid(commandBlock, data.event)) return

    let trigger = new Trigger(commandBlock, data)
    return trigger
  }

  static isValid(commandBlock, event) {
    if (commandBlock.hasTrigger(event)) return false

    this.validEvents = this.getValidEvents(commandBlock.game)
    return this.validEvents.indexOf(event) !== -1
  }

  static getTriggerNames() {
    let names = Object.keys(Constants.Triggers)

    let skip = ["start", "tick", "end"]
    skip.forEach((name) => {
      const index = names.indexOf(name)
      if (index > -1) {
        names.splice(index, 1)
      }
    })

    return names
  }

  static getValidEvents(game) {
    let events = this.getTriggerNames()
    events = events.concat(this.getCommandBlockTimerEvents(game))
    return events
  }

  static getCommandBlockTimerEvents(game) {
    let result = []

    for (let id in game.sector.commandBlockTimers) {
      let timer = game.sector.commandBlockTimers[id]
      let timerEvents = ["start", "tick", "end"]
      timerEvents.forEach((timerEvent) => {
        let eventName = "Timer:" + timer.timer.name + ":" + timerEvent
        result.push(eventName)
      })
    }

    return result
  }

  constructor(commandBlock, data) {
    super(commandBlock.game, data)

    this.event = data.event
    this.initActionContainer(data)

    this.commandBlock.addTrigger(this)
    this.onNodeChanged()
  }

  remove() {
    this.commandBlock.removeTrigger(this)
    super.remove()
  }

  toJson() {
    return {
      id: this.id,
      event: this.event,
      actions: this.actions.map((actionEntry) => {
        return actionEntry.toJson()
      })
    }
  }
}

Object.assign(Trigger.prototype, ActionContainer.prototype, {
})

module.exports = Trigger
