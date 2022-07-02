const SeekAction = require("./seek_action")

class SeekSoil extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekSoil"
  }

}

module.exports = SeekSoil