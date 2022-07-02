const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipper  = require("./../../../../common/interfaces/equipper")

class SlaveTrader extends LandMob {
  constructor(game, data) {
    super(game, data)
  }

  openMenu() {
    this.game.slaveTradeMenu.open(this)
  }

  isInteractable() {
    return true
  }

  getSpritePath() {
    return "slave_trader.png"
  }

  getConstantsTable() {
    return "Mobs.SlaveTrader"
  }

  getType() {
    return Protocol.definition().MobType.SlaveTrader
  }


}

module.exports = SlaveTrader
