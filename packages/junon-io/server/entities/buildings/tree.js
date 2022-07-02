const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Tree extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Tree"
  }

  getType() {
    return Protocol.definition().BuildingType.Tree
  }

}

module.exports = Tree
