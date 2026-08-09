const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Flame extends BaseProjectile {
  constructor(game, data) {
    super(game, data)
    
    this.MAX_WIDTH_EXPANSION = this.getConstants().maxRadialExpansion * 2
  }

  onProjectileConstructed() {
    this.game.playSound("flame", { skipIfPlaying: true })
  }

  setAttributes(data) {
    super.setAttributes(data)

    data.w = data.width
    data.h = data.width

    this.origWidth = data.width

    this.minAlpha = 0.5
    this.sprite.alpha = this.minAlpha
    this.sprite.tint = ClientHelper.getRandomColorInRange("#ce5304", "#f8ce79", Math.random(), { shouldReturnInteger: true })
  }

  syncWithServer(data) {
    super.syncWithServer(data)

    this.instructToExpand(data.width)
  }

  interpolate(lastFrameTime) {
    super.interpolate(lastFrameTime)
  
    this.interpolateExpansion(lastFrameTime)
  }

  interpolateExpansion(lastFrameTime) {
    this.sprite.interpolateExpansion(lastFrameTime)
  }

  getSpritePath() {
    return 'white_gas.png'
  }
  
  getType() {
    return Protocol.definition().ProjectileType.Flame
  }

  getConstantsTable() {
    return "Projectiles.Flame"
  }

}

module.exports = Flame
