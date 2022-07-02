const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Residue extends BaseEffect {

  getConstantsTable() {
    return "Effects.Residue"
  }

}

module.exports = Residue
