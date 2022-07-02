const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SecurityCamera extends BaseBuilding {

  onConstructionFinished() {
    if (!this.content) {
      this.content = "Feed " + this.id
    }

    this.sector.addCameraFeed(this)
  }

  onBuildingContentChanged() {
    super.onBuildingContentChanged()

    this.sector.addCameraFeed(this)
  }

  getCenterRow() {
    return Math.floor(this.getRow() + (Math.cos(this.getRadAngle()) * 7 * 1))
  }

  getCenterCol() {
    return Math.floor(this.getCol() + (Math.sin(this.getRadAngle()) * 7 * -1))
  }

  getConstantsTable() {
    return "Buildings.SecurityCamera"
  }

  getType() {
    return Protocol.definition().BuildingType.SecurityCamera
  }

  remove() {
    super.remove()

    this.sector.removeCameraFeed(this)
  }

}

module.exports = SecurityCamera
