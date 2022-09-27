const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Item = require("../entities/item")
const Mobs = require("../entities/mobs/index")

class Trader extends BaseCommand {
  getUsage() {
    return [
      "/trader buy [item] [cost]",
      "/trader unbuy [item]",
      "/trader sellcustom [allow|deny]",
      "/trader sell [item] [cost]",
      "/trader unsell [item]"
    ]
  }


  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let subcommand = args[0]
    let itemName = args[1] || ""
    let klassName = this.sector.klassifySnakeCase(itemName)
    let klass 
    let disallowedMobs = ["Guard", "Drone", "Chemist", "Raven"]
    let cost

    klass = Item.getKlassByName(klassName)
    if (!klass) {
      klass = Mobs[klassName]
    }

    switch(subcommand) {
      case "buy": 
        // verify its a valid item name
        cost = parseInt(args[2])
        if (!itemName || !cost) {
           player.showChatError("/trader buy [item] [cost]")
           return
        }

        if (disallowedMobs.indexOf(klassName) !== -1) return

        if (!klass) {
          player.showChatError("no such item " + itemName)
          return
        }

        if (isNaN(cost)) {
          player.showChatError("invalid cost " + cost)
          return
        }

        if (cost <= 0) {
          player.showChatError("invalid cost " + cost)
          return
        }

        let resourceType = args[3] || ""
        resourceType = this.sector.klassifySnakeCase(resourceType)

        let building = Protocol.definition().BuildingType[resourceType]
        if (resourceType && !building) {
          player.showChatError("invalid item type " + resourceType)
          return
        }

        this.sector.setSellable(klass, cost, resourceType)

        let currency = "G"
        if (resourceType) {
          currency = resourceType
        }

        player.showChatSuccess(itemName + " buy price set to " + cost + " " + currency + " in trader")
        break
      case "unbuy": 

        if (!klass) {
          player.showChatError("no such item " + itemName)
          return
        }

        if (this.sector.hasSellable(klass)) {
          this.sector.deleteSellable(klass)
          player.showChatSuccess("removed buy item " + itemName + " from trader")
        }
        break
      case "sellcustom": 
        let flag = args[1]
        if (flag === "allow") {
          this.sector.setCustomSell(true)
          player.showChatSuccess("customsell set to allow")
        } else if (flag === "deny") {
          this.sector.setCustomSell(false)
          player.showChatSuccess("customsell set to deny")
        } else if (!flag) {
          let result = this.sector.isCustomSell === true ? "allow" : "deny"
          player.showChatSuccess(result)
        } else {
          player.showChatError("Valid values are allow, deny")
        }
        break
      case "sell": 
        // verify its a valid item name
        cost = parseInt(args[2])
        if (!itemName || !cost) {
           player.showChatError("/trader sell [item] [cost]")
           return
        }

        if (disallowedMobs.indexOf(klassName) !== -1) return

        if (!klass) {
          player.showChatError("no such item " + itemName)
          return
        }

        if (isNaN(cost)) {
          player.showChatError("invalid cost " + cost)
          return
        }

        if (cost <= 0) {
          player.showChatError("invalid cost " + cost)
          return
        }

        this.sector.setPurchasable(klass, cost)
        player.showChatSuccess(itemName + " sell price set to " + cost + "G in trader")
        break
      case "unsell": 

        if (!klass) {
          player.showChatError("no such item " + itemName)
          return
        }

        if (this.sector.hasPurchasable(klass)) {
          this.sector.deletePurchasable(klass)
          player.showChatSuccess("removed sell item " + itemName + " from trader")
        }
        break
      default: 
        player.showChatError("no such subcommand: /trader " + subcommand)
        break
    }
  }
}

module.exports = Trader
