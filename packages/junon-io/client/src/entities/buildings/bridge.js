const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Bridge extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    this.animate()
  }

  animate() {
    this.animationInterval = setInterval(() => {
      this.sprite.scale.set(0 - this.sprite.scale.x)
    }, 500)
  }

  cleanupInterval() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval)
      this.animationInterval = null
    }
  }

  renderEntityMenu(entityMenu) {
    super.renderEntityMenu(entityMenu)
    // this.showAction(entityMenu)
  }

  showAction(entityMenu) {
    const pilot = "<div class='pilot_btn ui_btn' data-action='pilot'>Pilot</div>"

    entityMenu.querySelector(".entity_action").innerHTML = pilot
  }

  remove() {
    super.remove()

    this.cleanupInterval()
  }

  getType() {
    return Protocol.definition().BuildingType.Bridge
  }

  isNotForSale() {
    return true
  }

  getSpritePath() {
    return "bridge_black.png"
  }

  getConstantsTable() {
    return "Buildings.Bridge"
  }

}

module.exports = Bridge
