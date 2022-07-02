const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseBuilding = require("./base_building")

class Beacon extends BaseBuilding {

  renderEntityMenu(entityMenu) {
    super.renderEntityMenu(entityMenu)

    this.showSpawnPositions(entityMenu)
  }

  showSpawnPositions(entityMenu) {
    if (!this.content) {
      entityMenu.querySelector(".spawn_select").value = "everyone"
    } else {
      entityMenu.querySelector(".spawn_select").value = this.content
    }
  }

  getSpritePath() {
    return "beacon.png"
  }

  getType() {
    return Protocol.definition().BuildingType.Beacon
  }

  getConstantsTable() {
    return "Buildings.Beacon"
  }

}

module.exports = Beacon
