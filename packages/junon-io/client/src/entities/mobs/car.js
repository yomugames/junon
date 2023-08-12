const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")

class Car extends BaseMob {

  getSpritePath() {
    return "car.png"
  }

  animateEquipment() {
  }

  shouldShowInteractTooltip() {
    return this.owner
  }


  getConstantsTable() {
    return "Mobs.Car"
  }

  getType() {
    return Protocol.definition().MobType.Car
  }
  
  animateExplosion() {
    const smokeCount = 4
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }
  }

  // on client, we want bioraptor to circle to be smaller
  // so unitmap would only register one tile per bioraptor if centered on tile
  // then we'll be able to select bioraptor apart from cryotube
  getWidth() {
    return Constants.tileSize
  }

  getHeight() {
    return Constants.tileSize
  }

}

module.exports = Car
