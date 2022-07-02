const SeekAction = require("./seek_action")

class SeekSeed extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekSeed"
  }


}

module.exports = SeekSeed