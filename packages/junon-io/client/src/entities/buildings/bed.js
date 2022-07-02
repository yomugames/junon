const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")

class Bed extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  shouldShowInteractTooltip() {
    let distance = Helper.distance(this.game.player.getX(), this.game.player.getY(), this.getX(), this.getY())
    if (distance > (Constants.tileSize * 2)) {
      return false
    }

    return super.shouldShowInteractTooltip()
  }

  getType() {
    return Protocol.definition().BuildingType.Bed
  }

  getSpritePath() {
    return "bed.png"
  }

  getConstantsTable() {
    return "Buildings.Bed"
  }

}

module.exports = Bed
