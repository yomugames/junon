const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Beaker extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onContentChanged() {
    const tint = ClientHelper.getTintForSample(this.content)
    this.getTintableSprite().tint = tint
  }

  getType() {
    return Protocol.definition().BuildingType.Beaker
  }

  getSpritePath() {
    return "beaker.png"
  }

  getConstantsTable() {
    return "Buildings.Beaker"
  }

}

module.exports = Beaker
