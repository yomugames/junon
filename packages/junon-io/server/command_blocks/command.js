const ActionValue = require("./action_value")
const Commands = require("../commands/index")

class Command extends ActionValue {
  static isValid(value) {
    let tokens = value.split(" ")
    let cmd = tokens[0]
    if (cmd[0] !== '/') return false
    cmd = cmd.replace("/", "")

    if (!Commands[cmd]) {
      return false
    }

    return true
  }

  edit(value, player) {
    if (!Command.isValid(value)) {
      this.getSocketUtil().broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
        id: this.id,
        error: "Invalid command"
      })
      return
    }

    this.value = value
    this.onValueChanged()
  }

}

module.exports = Command
