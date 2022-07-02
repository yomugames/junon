const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Bed extends BaseBuilding {

  postBuildingConstructedForStructure() {
  }

  interact(user) {
    user.setPosition(this.getX(), this.getY())
    user.sleep()
    if (user.isPlayer()) {
      user.walkthroughManager.handle("sleep")
    }
  }

  getInteractDistance() {
    return Constants.tileSize
  }

  remove() {
    super.remove()
  }

  getConstantsTable() {
    return "Buildings.Bed"
  }

  getType() {
    return Protocol.definition().BuildingType.Bed
  }

}

module.exports = Bed

