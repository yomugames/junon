const SeekAction = require("./seek_action")

class SeekTable extends SeekAction {

  static setup(planner) {
    let table = planner.getClosestTable()
    if (!table) return false

    return { targetEntity: table }
  }


  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekTable"
  }

}

module.exports = SeekTable