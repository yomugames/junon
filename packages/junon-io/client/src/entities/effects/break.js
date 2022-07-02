const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Break extends BaseEffect {

  getConstantsTable() {
    return "Effects.Break"
  }

  onPostInit() {
    this.onLevelChanged(1)
  }  

  onLevelChanged(level) {
    this.setSize(level)
  }

  setSize(level) {
    let size = (level / this.getMaxEffectLevel()) * Constants.tileSize
    this.sprite.width  = size
    this.sprite.height = size
  }

  getMaxEffectLevel() {
    return 1
  }


}

module.exports = Break
