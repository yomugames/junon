const SeekAction = require("./seek_action")
const Constants = require('../../../../common/constants.json')

class SeekButcherTable extends SeekAction {

  perform(options) {
    this.butcherTable = options.targetEntity

    let position = this.butcherTable.getWorkPosition()
    let row = Math.floor(position.y / Constants.tileSize)
    let col = Math.floor(position.x / Constants.tileSize)
    let platform = this.butcherTable.getContainer().getStandingPlatform(row, col)

    this.goal = this.planner.entity.addGoalTarget(platform, { isExact: true })
    this.handleGoal(this.goal)

    if (this.goal) {
      this.butcherTable.claim(this.planner.entity)
    }
  }

  getBehaviorName() {
    return "SeekButcherTable"
  }

  onDragTargetRemoved() {
    this.goal.remove()
  }

}

module.exports = SeekButcherTable