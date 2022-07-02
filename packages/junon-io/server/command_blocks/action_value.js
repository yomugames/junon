const Node = require("./node")

class ActionValue extends Node {
  constructor(actionEntry, data) {
    super(actionEntry.game, data)

    this.actionEntry = actionEntry

    this.value = data.value

    this.actionEntry.addActionValue(this)
  }

  remove() {
    this.actionEntry.removeActionValue(this)
    super.remove()
  }

  edit(value) {
    this.value = value
    this.onValueChanged()
  }

  onValueChanged() {
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      operation: "edit",
      id: this.id,
      value: this.value
    })

    this.onNodeChanged()
  }

  toJson() {
    return {
      id: this.id,
      value: this.value
    }
  }
}

module.exports = ActionValue
