const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class BarTable extends BaseBuilding {
  constructor(data, container) {
    super(data, container);

    this.sector.barTableCount += 1;
  }

  getConstantsTable() {
    return "Buildings.BarTable"
  }

  getType() {
    return Protocol.definition().BuildingType.BarTable
  }

  remove() {
    super.remove();

    this.sector.barTableCount -= 1;
  }
}

module.exports = BarTable