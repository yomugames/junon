const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Terminal extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    // this.animate()
  }

  openMenu() {
    // if (this.game.isMiniGame() && this.isUserImposter()) {
    //   if (!this.game.terminalMenu.isChoiceSubmitted) {
        this.game.terminalMenu.open({ entity: this })
    //   }
    // }
  }

  isUserImposter() {
    let result = false
    
    for (let index in this.game.player.inventory) {
      let item = this.game.player.inventory[index]
      if (item.type === Protocol.definition().BuildingType.AssassinsKnife) {
        result = true
        break
      }
    }

    return result
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
