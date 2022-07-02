const BaseAction = require("./base_action")
const Item = require("../../item")
const Buildings = require("../../buildings/index")

class CollectWater extends BaseAction {
  perform(options) {
    let bottleItem = this.planner.entity.getHandItem()
    bottleItem.instance.draw(this.planner.entity, options.waterSource)
  }

  shouldCompleteAfterPerform() {
    return true
  }

}

module.exports = CollectWater