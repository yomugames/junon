const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const SocketUtil = require("./../../util/socket_util")
const ClientHelper = require("./../../util/client_helper")

class PowerSwitch extends BaseBuilding {

  shouldShowInteractTooltip() {
    if (this.game.player.isGuest()) return false
      
    return super.shouldShowInteractTooltip()
  }

  onOpenChanged() {
    super.onOpenChanged()

    if (this.isOpen) {
      this.offSprite.alpha = 0
    } else {
      this.offSprite.alpha = 1
    }
  }

  getType() {
    return Protocol.definition().BuildingType.PowerSwitch
  }

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()
    this.offSprite = new PIXI.Sprite(PIXI.utils.TextureCache["power_switch_off.png"])
    this.offSprite.position.x = -20
    this.offSprite.position.y = -12
    this.offSprite.alpha = 0
    sprite.addChild(this.offSprite)
    return sprite
  }

  getSpritePath() {
    return "power_switch.png"
  }

  getConstantsTable() {
    return "Buildings.PowerSwitch"
  }

}

module.exports = PowerSwitch
