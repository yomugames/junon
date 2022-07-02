const BaseAction = require("./base_action")

class StoreItem extends BaseAction {
  perform(options) {
    this.planner.entity.equipments.removeItem(options.item)
    options.storage.store(options.item)
  }

  shouldCompleteAfterPerform() {
    return true
  }


}

module.exports = StoreItem