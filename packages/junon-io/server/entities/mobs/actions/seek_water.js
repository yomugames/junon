const SeekAction = require("./seek_action")

class SeekWater extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekWater"
  }

}

module.exports = SeekWater