const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Interact extends BaseCommand {
  getUsage() {
    return [
      "Interacts in different ways with an entity",
      "/interact [entity_id] [open|close]",
      "/interact [entity_id] angle [0-360]",
      "/interact [entity_id] generate [type]",
      "/interact [entity_id] processingrate [1-5]",
      "/interact [entity_id] unown",
      "/interact [entity_id] shoot",
      "/interact [entity_id] content",
      "/interact [entity_id] attack [target]",
      "ex: /interact 1234 angle 45"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const selector = args[0]
    const operation = args[1]

    let entities = this.getEntitiesBySelector(selector)
    if (entities.length === 0) {
      player.showChatError("Invalid entityId " + selector)

      return
    }

    entities.forEach((entity) => {
      if (operation === "angle") {
        const angle = parseInt(args[2])
        if (!isNaN(angle)) {
          entity.setAngle(angle)
        }
      }

      if (entity.isBuilding()) {
        if (operation === "generate") {
          if (entity.hasCategory("mining_drill")) {
            const output = args[2]
            let klassName = this.sector.klassifySnakeCase(output)
            if (Protocol.definition().BuildingType[klassName]) {
              entity.setBuildingContent(output)
            } else {
              player.showChatError("Invalid item " + output)
            }
          }
        }

        if (operation === "content") {
          if (entity.hasEditableContent()) {
            const content = args.slice(2).join(" ")
            if (this.isJson(content)) {
              let json = JSON.parse(content)
              entity.setLocaleContent(json.locale, json.text)
            } else {
              entity.setBuildingContent(content)
            }

          }
        }

        if (operation === "processingrate") {
          const rate = parseInt(args[2])
          if (!isNaN(rate) && rate > 0 && rate <= 5) {
            entity.setProcessingRate(rate)
          }
        }

        if (entity.hasCategory("door") || entity.hasCategory("switch")) {
          if (operation === "open") {
            entity.open()
          } else if (operation === "close") {
            entity.close()
          }
        }

        if (entity.hasCategory("turret")) {
          if (operation === "shoot") {
            entity.shootProjectile(null, { ignoreAmmo: true, ignoreTarget: true })
          }
        }

        if (operation === "unown") {
          entity.setOwner(null)
        }

      }
      if (operation === "attack") {
        if (entity.isMob() || entity.isBuilding()) {
          const target = this.game.getEntityByNameOrId(args[2])
          
          if (target && typeof entity.performAttack === 'function') {
            entity.performAttack(target)
          }
        }
      }
      
    })

  }
}

module.exports = Interact
