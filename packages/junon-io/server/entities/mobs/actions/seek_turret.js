const SeekAction = require("./seek_action")

class SeekTurret extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekTurret"
  }

}

module.exports = SeekTurret