const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AirAlarm extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.AirAlarm
  }

  getSpritePath() {
    return "air_alarm.png"
  }

  getConstantsTable() {
    return "Buildings.AirAlarm"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["air_alarm_base.png"])
    this.baseSprite.name = "AirAlarmBase"
    this.baseSprite.anchor.set(0.5)

    this.lcdSprite = new PIXI.Sprite(PIXI.utils.TextureCache["air_alarm_lcd.png"])
    this.lcdSprite.name = "AirAlarmLED"
    this.lcdSprite.anchor.set(0.5)
    this.lcdSprite.position.y = -5

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.lcdSprite)

    return sprite
  }


  onOpenChanged() {
    super.onOpenChanged()
    
    if (this.isOpen) {
      this.assignLighting()
      this.lcdSprite.tint = 0xeb2215 // red
    } else {
      this.unassignLighting()
      this.lcdSprite.tint = 0x07b24c // green
    }
  }

}

module.exports = AirAlarm
