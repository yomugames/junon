const Trader = require("./trader")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")

class SlaveTrader extends Trader {

  registerEventManager() {
    this.game.eventManager.registerSlaveTrader(this, this.owner)
  }

  unregisterEventManager() {
    this.game.eventManager.unregisterSlaveTrader(this, this.owner)
  }

  getTradingTableType() {
    return Protocol.definition().BuildingType.SlaversTable
  }

  getType() {
    return Protocol.definition().MobType.SlaveTrader
  }

  getConstantsTable() {
    return "Mobs.SlaveTrader"
  }

}

module.exports = SlaveTrader