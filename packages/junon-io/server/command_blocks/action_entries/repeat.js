const ActionEntry = require("./action_entry")
const ActionContainer = require("../action_container")
const Constants = require("../../../common/constants.json")

class Repeat extends ActionEntry {

  constructor(parent, data) {
    super(parent, data)
  }

  static create(parent, data) {
    if (!this.isValid(parent, data.actionKey)) return

    return new Repeat(parent, data)
  }

  static isValid(parent, actionKey) {
    return true
  }

  static sanitizeTimes(times) {
    let str = (times === undefined || times === null) ? "" : times.toString().trim()

    if (str === "") return 1

    if (/^-?\d+$/.test(str)) {
      let num = parseInt(str)

      if (isNaN(num) || num < 1) {
        num = 1
      } else if (num > Constants.maxRepeatTimes) {
        num = Constants.maxRepeatTimes
      }

      return num
    }

    return str
  }

  handleActionValues(data) {
    this.times = Repeat.sanitizeTimes(data.times)

    this.initActionContainer(data)
  }

  editChildNode(data) {

  }

  edit(value, player) {
    let tokens = value.split(":")

    if (tokens[0] !== "times")
      return

    this.times = Repeat.sanitizeTimes(tokens[1])

    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      id: this.id,
      operation: "edit",
      value: "times:" + this.times
    })

    this.commandBlock.onNodeChanged()
  }

  toJson() {
    return {
      id: this.id,
      actionKey: this.actionKey,
      times: this.times,
      actions: this.actions.map((actionEntry) => {
        return actionEntry.toJson()
      })
    }
  }

}

Object.assign(Repeat.prototype, ActionContainer.prototype, {
})

module.exports = Repeat