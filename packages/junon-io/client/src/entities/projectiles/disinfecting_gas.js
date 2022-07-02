const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class DisinfectingGas extends BaseProjectile {

  constructor(game, data) {
    super(game, data)
    this.MAX_WIDTH_EXPANSION = this.getConstants().maxRadialExpansion 
  }

  onProjectileConstructed() {
    this.game.playSound("gas_release", { skipIfPlaying: true })
  }
  
  reset() {
    super.reset()
    this.sprite.width = 0
  }

  setAttributes(data) {
    super.setAttributes(data)

    data.w = data.width
    data.h = data.width

    this.origWidth = data.width

    this.minAlpha = 0.3
    this.sprite.alpha = this.minAlpha
    this.sprite.tint = ClientHelper.getRandomColorInRange("#cccccc", "#ffffff", Math.random(), { shouldReturnInteger: true })
  }

  syncWithServer(data) {
    super.syncWithServer(data)

    this.instructToExpand(data.width)
  }

  interpolate(lastFrameTime) {
    this.interpolateExpansion(lastFrameTime)
  }

  interpolateExpansion(lastFrameTime) {
    this.sprite.interpolateExpansion(lastFrameTime)
  }

  getSpritePath() {
    return 'white_gas.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.DisinfectingGas
  }

  getConstantsTable() {
    return "Projectiles.DisinfectingGas"
  }

}

module.exports = DisinfectingGas

