const SeekAction = require("./seek_action");

class SeekBarTable extends SeekAction {
    perform(options) {
        let goal = this.planner.entity.addGoalTarget(options.targetEntity)
        this.handleGoal(goal)

        if(goal) {
            options.targetEntity.claim(this.planner.entity)
        }
    }

    getBehaviorName() {
        return "SeekBarTable"
    }
}

module.exports = SeekBarTable;