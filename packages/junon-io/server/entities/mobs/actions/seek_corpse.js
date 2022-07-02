const SeekAction = require("./seek_action")

class SeekCorpse extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)

    if (goal) {
      options.targetEntity.claim(this.planner.entity)
    }
  }

  getBehaviorName() {
    return "SeekCorpse"
  }

}

module.exports = SeekCorpse