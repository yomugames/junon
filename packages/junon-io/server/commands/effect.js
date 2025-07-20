const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Effect extends BaseCommand {
  getUsage() {
    return [
      "/effect give [player] [effectname]",
      "/effect clear [player] [effectname]",
      "/effect clear [player]",
      "ex: " + this.getAllowedEffects().join(", ")
    ]
  }

  allowOwnerOnly() {
    return true
  }

  getAllowedEffects() {
    return ["poison", "fire", "drunk", "fear", "miasma", "spin", "rage", "invisible", "haste", "paralyze", "smoke"]
  }

  perform(player, args) {
    let allowedEffects = this.getAllowedEffects()

    if (!player.isPlayer()) allowedEffects.push("smoke")

    if (args[[0]] === 'give') {
      if (!args[1]) {
        player.showChatError("/effect give [player] [" + allowedEffects.join(" | ") + "]")
        return
      }

      let entityName = args[1]
      let entities = this.getEntitiesBySelector(entityName)
      if (entities.length === 0) {
        player.showChatError("No entities found " + entityName)
        return
      }

      let targetEffect = (args[2] || "").toLowerCase()
      if (allowedEffects.indexOf(targetEffect) === -1) {
        player.showChatError("No such effect " + targetEffect)
        return
      }

      entities.forEach((entity) => {
        if (typeof entity.addEffect === 'function') {
          if (entity.canAddEffect(targetEffect)) {
            entity.addEffect(targetEffect)
          }
          
        }
      })

      player.showChatSuccess("success")
    } else if (args[0] === 'set') {
      if (!args[1]) {
        player.showChatError("/effect set [id] [" + allowedEffects.join(" | ") + "]")
        return
      }

      let entityName = args[1]
      let targetEntities = this.getEntitiesBySelector(entityName)
      if (targetEntities.length === 0) {
        player.showChatError("No such entity " + entityName)
        return
      }

      let targetEffect = args[2]
      if (allowedEffects.indexOf(targetEffect) === -1) {
        player.showChatError("No such effect " + targetEffect)
        return
      }

      let level = parseInt(args[3])
      if (isNaN(level)) return

      targetEntities.forEach((targetEntity) => {
        targetEntity.setEffectLevel(targetEffect, level)
      })
    } else if (args[0] === 'clear') {
      if (!args[1]) {
        player.showChatError("/effect clear [player] [" + allowedEffects.join(" | ") + "]")
        player.showChatError("/effect clear [player]")
        return
      }

      let entityName = args[1]
      let entities = this.getEntitiesBySelector(entityName)
      if (entities.length === 0) {
        player.showChatError("No entities found: " + entityName)
        return
      }

      if (args[2]) {
        let targetEffect = args[2]
        if (allowedEffects.indexOf(targetEffect) === -1) {
          player.showChatError("No such effect " + targetEffect)
          return
        }

        entities.forEach((entity) => {
          entity.removeEffect(targetEffect)
        })
      } else {
        entities.forEach((entity) => {
          entity.removeAllEffects()
        })
      }
    } 
  }
}

module.exports = Effect

