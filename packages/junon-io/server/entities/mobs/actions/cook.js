const BaseAction = require("./base_action")

class Cook extends BaseAction {

  perform(options) {
    this.planner.entity.setDormant(true)
    let success = options.stove.interact(this.planner.entity, {
      onComplete: this.onCookFinished.bind(this)
    })

    if (!success) {
      this.onCookFinished(options.stove)
    }
  }

  getBehaviorName() {
    return "Cook"
  }

  onCookFinished(stove) {
    stove.unclaim()
    this.planner.entity.setDormant(false)
    this.complete()
  }

}

module.exports = Cook