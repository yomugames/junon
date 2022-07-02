const Constants = require("./../constants.json")

const Categorizable = () => {
}

Categorizable.prototype = {

  isBottleFillable() {
    return !!this.getConstants().isBottleFillable
  },

  hasCategory(category) {
    let result = false

    let constants = this.getConstants()

    let constantsTag = Constants.CategoryClassifiers[category]
    if (constantsTag) {
      return !!constants.stats && constants.stats[constantsTag]
    } else {
      return constants.categories &&
             constants.categories[category] 
    }
  }

}

module.exports = Categorizable
