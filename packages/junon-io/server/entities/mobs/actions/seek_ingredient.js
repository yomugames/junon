const SeekAction = require("./seek_action")
const Protocol = require('../../../../common/util/protocol')

class SeekIngredient extends SeekAction {

  perform(options) {
    let goal = this.planner.entity.addGoalTarget(options.targetEntity)
    this.handleGoal(goal)
  }

  getBehaviorName() {
    return "SeekIngredient"
  }

}

module.exports = SeekIngredient