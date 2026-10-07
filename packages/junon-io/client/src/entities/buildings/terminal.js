const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Terminal extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    // this.animate()
  }

  openMenu() {
    this.game.terminalMenu.open({ entity: this })
  }

  animate() {
    // this.animationInterval = setInterval(() => {
    //   this.sprite.scale.set(0 - this.sprite.scale.x)
    // }, 500)
  }

  cleanupInterval() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval)
      this.animationInterval = null
    }
  }

  showPowerOff() {
    super.showPowerOff()
    this.powerOffSprite.rotation = -Math.PI/2
  }

  remove() {
    super.remove()

    this.cleanupInterval()
  }

  getType() {
    return Protocol.definition().BuildingType.Terminal
  }

  isNotForSale() {
    return true
  }

  getSpritePath() {
    return "computer_terminal.png"
  }

  getConstantsTable() {
    return "Buildings.Terminal"
  }

}

module.exports = Terminal
