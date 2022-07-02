const BaseAction = require("./base_action")

class PickupCrop extends BaseAction {
  perform(options) {
    options.crop.unclaim()
    options.crop.harvestForMob(this.planner.entity)
  }

  shouldCompleteAfterPerform() {
    return true
  }


}

module.exports = PickupCrop