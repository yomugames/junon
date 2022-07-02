const BaseAction = require("./base_action")
const Item = require("../../item")
const Buildings = require("../../buildings/index")

class WaterSoil extends BaseAction {
  perform(options) {
    let bottle = this.planner.entity.getHandItem() 
    let seed = options.soil.getSeed()
    if (seed) {
      seed.water()
      bottle.instance.drain(20)
    }
  }

  shouldCompleteAfterPerform() {
    return true
  }

}

module.exports = WaterSoil