const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")

class PocketTrader extends HandEquipment {
  use(player, targetEntity) {
    this.getSocketUtil().emit(player.socket, "MenuAction", {
      action: "open",
      menu: "tradeMenu"
    })
  }

  getType() {
    return Protocol.definition().BuildingType.PocketTrader
  }

  getConstantsTable() {
    return "Equipments.PocketTrader"
  }
}

module.exports = PocketTrader
