const BaseAction = require("./base_action")
const Item = require("../../item")

class Pickup extends BaseAction {

  perform(options) {
    if (options.storage.isClaimed()) {
      options.storage.unclaim()
    }

    let item = options.storage.searchByCondition((item) => {
      return item.isDesiredItem(options.itemType)
    })

    if (!item) return 

    let amountReduced 

    if (item.isStackableType()) {
      if (options.maxCount) {
        amountReduced = item.reduceCount(item.count)
      } else if (options.count) {
        amountReduced = item.reduceCount(options.count)
      } else {
        amountReduced = item.reduceCount(1)
      }

      let handItem = new Item(this.planner.entity, item.type, { count: amountReduced })

      if (this.planner.entity.getHandItem()) {
        this.planner.entity.setExtraItem(handItem)
      } else {
        this.planner.entity.setHandItem(handItem)
      }

    } else {
      // not stackable
      item.storage.removeItem(item)
      
      if (this.planner.entity.getHandItem()) {
        this.planner.entity.setExtraItem(item)
      } else {
        this.planner.entity.setHandItem(item)
      }
    }

  }

  shouldCompleteAfterPerform() {
    return true
  }

}

module.exports = Pickup