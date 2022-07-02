const SeekAction = require("./seek_action")

class SeekFood extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekFood"
  }

}

module.exports = SeekFood