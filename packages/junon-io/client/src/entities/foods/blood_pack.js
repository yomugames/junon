const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BloodPack extends BaseFood {

  getSpritePath() {
    return 'blood_pack.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BloodPack
  }

  getConstantsTable() {
    return "Foods.BloodPack"
  }

}

module.exports = BloodPack
