const Command = require("../command")
const ActionEntry = require("./action_entry")

class Timer extends ActionEntry {
  static create(parent, data) {
    if (!this.isValid(parent, data.actionKey)) return

    return new Timer(parent, data)
  }

  constructor(parent, data) {
    super(parent, data)

    this.game.sector.addCommandBlockTimer(this)
  }

  static isValid(parent, actionKey) {
    return true
  }

  getChildren() {
    return []
  }

  handleActionValues(data) {
    this.parseData(data)
  }

  parseData(data) {
    this.timer = { name: "Timer", duration: 10, every: 1 }

    if (data.timer) {
      this.timer.name = data.timer.name
      this.setDuration(data.timer.duration)
      this.setEvery(data.timer.every)
    }
  }

  setDuration(duration) {
    this.timer.duration = parseInt(duration)

    if (isNaN(this.timer.duration)) {
      this.timer.duration = 1
    } else if (this.timer.duration < 0) {
      this.timer.duration = 1
    }
  }

  setEvery(every) {
    this.timer.every = parseInt(every)

    if (isNaN(this.timer.every)) {
      this.timer.every = 1
    } else if (this.timer.every < 1) {
      this.timer.every = 1
    }
  }

  edit(text, player) {
    let key = text.split(":")[0]
    let value = text.split(":")[1]

    if (key === 'name') {
      this.timer.name = value
      this.onValueChanged(key, value)
    } else if (key === 'duration') {
      this.setDuration(value)
      this.onValueChanged(key, this.timer.duration)
    } else if (key === 'every') {
      this.setEvery(value)
      this.onValueChanged(key, this.timer.every)
    }

    this.game.sector.onCommandBlockTimerUpdated(this.toJson())
  }

  onValueChanged(key, value) {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      operation: "edit",
      id: this.id,
      value: [key, value].join(":")
    })

    this.onNodeChanged()
  }

  remove() {
    super.remove()
    this.game.sector.removeCommandBlockTimer(this)
  }

  toJson() {
    return {
      id: this.id,
      actionKey: this.actionKey,
      timer: {
        name: this.timer.name,
        duration: this.timer.duration,
        every: this.timer.every
      }
    }
  }

}

module.exports = Timer
