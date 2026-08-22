const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Ping extends BaseCommand {
  getUsage() {
    return [
      "Triggers a ping event in the command block",
      "/ping [player|entity_id] [ping_id]",
      "Ping id is used to differentiate command calls",
      "ex: /ping @a 1"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const entityName = args[0]
    const pingId = args[1]

    let entities = this.getEntitiesBySelector(entityName)
    
    entities.forEach((entity) => {
      if (typeof entity.ping === 'function') {
        entity.ping(pingId)
      }
    })
  }
}

module.exports = Ping