const BaseAction = require("./base_action")

class Butcher extends BaseAction {

  perform(options) {
    this.planner.entity.setDormant(true)
    let success = options.butcherTable.interact(this.planner.entity, {
      onComplete: this.onButcherFinished.bind(this)
    })

    if (!success) {
      this.onButcherFinished(options.butcherTable)
    }
  }

  getBehaviorName() {
    return "Butcher"
  }

  onButcherFinished(butcherTable) {
    butcherTable.unclaim()
    this.planner.entity.setDormant(false)
    this.complete()
  }

}

module.exports = Butcher