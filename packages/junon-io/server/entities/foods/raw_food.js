const BaseFood = require("./base_food")

class RawFood extends BaseFood {
  isRaw() {
    return true
  }

}

module.exports = RawFood