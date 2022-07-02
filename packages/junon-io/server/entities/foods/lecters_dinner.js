const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class LectersDinner extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.LectersDinner
  }

  getConstantsTable() {
    return "Foods.LectersDinner"
  }
}

module.exports = LectersDinner
