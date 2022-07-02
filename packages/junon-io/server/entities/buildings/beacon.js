const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Beacon extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.content) {
      this.sector.addSpawnPoint(this.content, this)
    }
  }

  remove() {
    if (this.content) {
      this.sector.removeSpawnPoint(this.content, this)
    }

    super.remove()
  }

  onBuildingContentChanged(oldContent, newContent) {
    if (oldContent) {
      this.sector.removeSpawnPoint(oldContent, this)
    }

    if (this.content) {
      this.sector.addSpawnPoint(this.content, this)
    }

    super.onBuildingContentChanged(oldContent, newContent) 
  }

  getConstantsTable() {
    return "Buildings.Beacon"
  }

  getType() {
    return Protocol.definition().BuildingType.Beacon
  }

}

module.exports = Beacon
