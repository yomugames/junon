const BaseAction = require("./base_action")

class SeekAction extends BaseAction {

  handleGoal(goal) {
    if (!goal) {
      this.complete()
      return
    } 
      
    goal.setOnReachedListener(this.onGoalReached.bind(this))
    goal.setOnRemovedListener(this.onGoalRemoved.bind(this))
  }

  onGoalReached(entity) {
    if (this.options.onComplete) {
      this.isCompleted = true
      this.options.onComplete(entity)
    }
  }

  onGoalRemoved() {
    if (!this.isCompleted) {
      this.complete()
    }
  }

}

module.exports = SeekAction