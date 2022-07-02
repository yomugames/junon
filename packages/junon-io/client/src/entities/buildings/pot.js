const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Ores = require("./../ores/index")

class Pot extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onContentChanged() {
    const itemType = this.content

    if (itemType) {
      let data = { x: 0, y: 0, user: this }
      this.plant = Ores.forType(itemType).build(this.game, data)
      this.plant.sprite.position.x = 0
      this.plant.sprite.position.y = 0
      this.plant.sprite.anchor.set(0.5)
      this.plant.sprite.width = 25
      this.plant.sprite.height = 25
    } else if (this.plant) {
      // no more flower in storage, remove it
      this.plant.remove()
    }
  }

  shouldShowInteractTooltip() {
    let team = this.game.player.getTeam()
    if (!this.game.isLeaderAndOwner(this, team, this.game.player)) {
      return false
    }

    return super.shouldShowInteractTooltip()
  }

  getType() {
    return Protocol.definition().BuildingType.Pot
  }

  getSpritePath() {
    return "pot.png"
  }

  getConstantsTable() {
    return "Buildings.Pot"
  }

}

module.exports = Pot
