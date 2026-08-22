const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Kill extends BaseCommand {
  getUsage() {
    return [
      "Kills or destroys an entity",
      "/kill [player]",
      "/kill [entity_id]",
      "/kill pickup [item_type]",
      "/kill corpse [mob_type]",
      "ex: /kill kuroro"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  killCorpse(corpseTypeName) {
    let typeName = corpseTypeName && this.game.sector.klassifySnakeCase(corpseTypeName)

    this.game.sector.forEachCorpse((corpse) => {
      if (corpseTypeName) {
        if (corpse.getTypeName() === typeName) {
          corpse.remove()
        }
      } else {
        corpse.remove()
      }
    })
  }

  killPickup(itemTypeName) {
    let typeName = itemTypeName && this.game.sector.klassifySnakeCase(itemTypeName)

    this.game.sector.forEachPickup((pickup) => {
      if (itemTypeName) {
        if (pickup.getTypeName() === typeName) {
          pickup.remove()
        }
      } else {
        pickup.remove()
      }
    })
  }

  perform(caller, args) {
    const entityName = args[0]

    // corpse name
    if (entityName === 'corpse') {
      this.killCorpse(args[1])
      return
    }

    // corpse name
    if (entityName === 'pickup') {
      this.killPickup(args[1])
      return
    }

    // mob name
    let mobTypeName = this.game.sector.klassifySnakeCase(entityName)
    if (Protocol.definition().MobType.hasOwnProperty(mobTypeName)) {
      this.game.sector.forEachMobsByTypeName(mobTypeName, (mob) => {
        mob.remove()
      })
      return
    }

    let selector = entityName
    let entities = this.getEntitiesBySelector(selector)
    if (entities.length === 0 && caller.isPlayer()) {
      caller.showChatError("No entities found: " + selector)
      return
    }

    entities.forEach((entity) => {
      if (!entity.isBuilding || !entity.isMob || !entity.isCorpse) {
        // invalid entity type, missing functions. skip
      } else if (entity.isMob() || entity.isBuilding() || entity.isCorpse()) {
        entity.remove()
      } else if (entity.isPlayer()) {
        entity.setHealth(0)
      }
    })

  }
}

module.exports = Kill
