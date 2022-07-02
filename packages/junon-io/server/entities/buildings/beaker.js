const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")


class Beaker extends BaseBuilding {

  interact(user) {
    const item = user.getActiveItem()
    if (item && item.isSyringe()) {
      item.use(user, this)
    }
  }

  drainSample() {
    let sample = this.getContent()
    this.setContent(null)
    return sample
  }

  getConstantsTable() {
    return "Buildings.Beaker"
  }

  getType() {
    return Protocol.definition().BuildingType.Beaker
  }

}

module.exports = Beaker

