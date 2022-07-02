const SeekAction = require("./seek_action")

class ReturnItem extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "ReturnItem"
  }

}

module.exports = ReturnItem