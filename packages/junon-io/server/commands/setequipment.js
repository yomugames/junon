const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Item = require("../entities/item")

class SetEquipment extends BaseCommand {
  getUsage() {
    return [
      "/setequipment [armor|hand] [username] [type]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    const slot = args[0]
    let index

    if (slot === 'armor') {
      index = Protocol.definition().EquipmentRole.Armor
    } else if (slot === 'hand') {
      index = Protocol.definition().EquipmentRole.Hand
    } else {
      player.showChatError(this.getUsage()[0])
      return
    }

    const username = args[1]

    let type = args[2] || ""
    type = this.sector.klassifySnakeCase(type)

    let targetPlayers = this.getPlayersBySelector(username)
    if (targetPlayers.length === 0) {
      player.showChatError("No such player: " + username)
      return
    }

    let typeId = Protocol.definition().BuildingType[type]
    if (!typeId) {
      player.showChatError("No such item: " + type)
      return
    }

    // validate proper armor/equipment
    let klass = Item.getKlass(typeId)
    if (!klass) {
      player.showChatError("No such item: " + type)
      return
    }

    if (typeof klass.prototype.isArmor !== 'function') {
      player.showChatError("invalid")
      return
    }

    if (slot === 'armor' && !klass.prototype.isArmor()) {
      player.showChatError("invalid")
      return
    }

    if (slot === 'hand' && klass.prototype.isArmor()) {
      player.showChatError("invalid")
      return
    }

    targetPlayers.forEach((targetPlayer) => {
      if (!targetPlayer.equipments.isFullyStored()) {
        let options = {}

        const item = targetPlayer.createItem(type, options)
        targetPlayer.equipments.storeAt(index, item)
      }
    })


  }
}

module.exports = SetEquipment
