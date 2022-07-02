const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Web extends BaseEffect {

  getConstantsTable() {
    return "Effects.Web"
  }

}

module.exports = Web
