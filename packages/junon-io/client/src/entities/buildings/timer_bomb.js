const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BitmapText = require("../../util/bitmap_text")

class TimerBomb extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onContentChanged() {
    let remaining = 10 - parseInt(this.content)
    if (!this.timerText) {
      this.timerText = BitmapText.create({
        label: "Timer",
        text: remaining,
        spriteContainer: this.sprite
      })
      this.timerText.sprite.position.y = -24
    } else {
      this.timerText.sprite.text = remaining
    }
  }

  getType() {
    return Protocol.definition().BuildingType.TimerBomb
  }

  getSpritePath() {
    return "timer_bomb.png"
  }

  getConstantsTable() {
    return "Buildings.TimerBomb"
  }

  remove() {
    super.remove()

    if (this.timerText) {
      this.timerText.remove()
    }
    
  }

}

module.exports = TimerBomb
