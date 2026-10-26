const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class SuitColor extends BaseCommand {
  getUsage() {
    return [
      "Changes the color of the suit of a player",
      "/suitcolor [player] [color]",
      "ex: /suitcolor kuroro red",
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  isNonSandboxCommand() {
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

    if (entities.length === 0) {
      const id = parseInt(selector)

      if (!isNaN(id)) {
        const entity = this.game.getEntity(id)

        if (entity && !entity.isPlayer()) {
          entities = [entity]
        }
      }

      if (entities.length === 0) {
        const entity = this.game.getMobByName(selector)

        if (entity) {
          entities = [entity]
        }
      }
    }

    entities.forEach((entity) => {
      entity.changeSuitColor(color)
    })
  }

}

module.exports = SuitColor
