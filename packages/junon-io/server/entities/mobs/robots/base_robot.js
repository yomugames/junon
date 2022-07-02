const LandMob = require("./../land_mob")
const Constants = require("./../../../../common/constants.json")

class BaseRobot extends LandMob {

  onPostInit() {
    this.setFaith(Constants.Faith.Obedient)
  }

  addMiasma() {
    // nope
  }

  shouldCreateDeadBody() {
    return false
  }

}

module.exports = BaseRobot
