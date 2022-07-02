const Command = require("../command")
const ActionEntry = require("./action_entry")
const SocketUtil = require("junon-common/socket_util")

class CommandActionEntry extends ActionEntry {
  static create(trigger, data) {
    if (!this.isValid(trigger, data.actionKey)) return

    return new CommandActionEntry(trigger, data)
  }

  static isValid(trigger, actionKey) {
    if (trigger.hasAction(actionKey)) return false
      
    this.validKeys = ["commands"]
    return this.validKeys.indexOf(actionKey) !== -1
  }

  handleActionValues(data) {
    this.commands = []
    this.parseActionValues(data.actionValues)
  }

  addActionValue(actionValue) {
    this.commands.push(actionValue)
  }

  removeActionValue(actionValue) {
    let index = this.commands.indexOf(actionValue)
    if (index !== -1) {
      this.commands.splice(index, 1)
    }
  }

  parseActionValues(list) {
    if (!list) return

    for (var i = 0; i < list.length; i++) {
      let item = list[i]
      new Command(this, item)
    }
  }

  addChildNode(data, player) {
    let tempId = data.tempId
    let value = data.value
    if (!Command.isValid(value)) {
      SocketUtil.broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
        id: this.id, 
        error: "invalid command"
      })
      return
    }

    let actionValue = new Command(this, { value: value })

    SocketUtil.broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
      id: actionValue.id, 
      operation: "add",
      value: actionValue.value,
      tempId: tempId
    })
  }

  editChildNode(data) {

  }

  getChildren() {
    return this.commands
  }

  toJson() {
    return {
      id: this.id,
      actionKey: this.actionKey,
      actionValues: this.commands.map((command) => {
        return command.toJson()
      })
    }
  }


}

module.exports = CommandActionEntry