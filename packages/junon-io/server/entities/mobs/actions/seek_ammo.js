const SeekAction = require("./seek_action")

class SeekAmmo extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekAmmo"
  }

}

module.exports = SeekAmmo