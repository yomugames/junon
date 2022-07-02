const CarbonGas = require("./carbon_gas")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class PoisonGas extends CarbonGas {
  constructor(game, data) {
    super(game, data)
  }

  setAttributes(data) {
    super.setAttributes(data)
    this.sprite.tint = ClientHelper.getRandomColorInRange("#a7e6a7", "#6aa56a", Math.random(), { shouldReturnInteger: true })
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonGas
  }

  getConstantsTable() {
    return "Projectiles.PoisonGas"
  }
}
module.exports = PoisonGas
