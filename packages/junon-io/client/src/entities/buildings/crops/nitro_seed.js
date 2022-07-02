const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class NitroSeed extends BaseSeed {

  // constructor(game, data, isEquipDisplay) {
  //   super(game, data, isEquipDisplay)
  // }

  getType() {
    return Protocol.definition().BuildingType.NitroSeed
  }

  getMatureSpritePath() {
    return "nitro_plant.png"
  }

  getSpritePath() {
    return "nitro_seed.png"
  }

  getConstantsTable() {
    return "Crops.NitroSeed"
  }

}

module.exports = NitroSeed
