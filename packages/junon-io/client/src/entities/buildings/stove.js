const Foods = require("./../foods/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ProgressBar = require("./../../components/progress_bar")

class Stove extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onContentChanged() {
    this.game.stoveMenu.render(this)  
  }

  openMenu() {
    const templateList = Foods.getCookables()
    
    let options = {
      entity: this
    }

    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    this.game.stoveMenu.open(options)
  }

  onUsageChanged() {
    if (this.isCookingComplete()) {
      this.initStoveProgressBar()
      this.stoveProgressBar.remove()
      this.stoveProgressBar = null
      this.game.stoveMenu.renderSelected()
    } else {
      this.initStoveProgressBar()
      this.stoveProgressBar.draw()
    }

    this.game.stoveMenu.onUsageChanged(this.usage)
  }

  initStoveProgressBar() {
    if (this.stoveProgressBar) return

    this.stoveProgressBar = new ProgressBar(this, { 
      attribute: "usage", 
      maxAttribute: "getUsageCapacity", 
      isFixedPosition: true,
      displayOnTop: true
    })
  }

  isCookingComplete() {
    return this.usage >= 100 || this.usage === 0
  }

  getType() {
    return Protocol.definition().BuildingType.Stove
  }

  shouldSetEmptyContentOnZeroUsage() {
    return false
  }

  getSpritePath() {
    return "stove.png"
  }

  getConstantsTable() {
    return "Buildings.Stove"
  }

}

module.exports = Stove
