const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Haste extends BaseEffect {

  getConstantsTable() {
    return "Effects.Haste"
  }

}

module.exports = Haste
