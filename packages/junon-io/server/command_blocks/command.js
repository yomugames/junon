const ActionValue = require("./action_value")
const Commands = require("../commands/index")
const SocketUtil = require("junon-common/socket_util")

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
      SocketUtil.broadcast(this.game.getSocketIds(), "CommandBlockUpdated", {
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