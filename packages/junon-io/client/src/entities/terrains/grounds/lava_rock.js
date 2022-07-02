const BaseGround = require("./base_ground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class LavaRock extends BaseGround {

  getSpritePath() {
    return 'lava_rock.png'
  }

  getType() {
    return Protocol.definition().TerrainType.LavaRock
  }

  getConstantsTable() {
    return "Terrains.LavaRock"
  }

}

module.exports = LavaRock
