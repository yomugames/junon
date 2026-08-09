const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class SuitColor extends BaseCommand {
  getUsage() {
    return [
      "/suitcolor [player] [color]",
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  getAvailableSuitColors() {
    return ["gray", "red", "green", "blue", "orange", "purple", "yellow", "black"]
  }

  perform(caller, args) {
    const selector = args[0]
    const color = args[1]

    if (this.getAvailableSuitColors().indexOf(color) === -1) {
      caller.showChatError("Invalid color")
      return
    }

    let entities = this.getPlayersBySelector(selector) 
    entities.forEach((entity) => {
      entity.changeSuitColor(color)
    })
  }

}

module.exports = SuitColor
