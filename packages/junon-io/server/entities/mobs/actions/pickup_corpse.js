const BaseAction = require("./base_action")

class PickupCorpse extends BaseAction {
  perform(options) {
    this.planner.entity.setDragTarget(options.corpse)
  }

  shouldCompleteAfterPerform() {
    return true
  }


}

module.exports = PickupCorpse