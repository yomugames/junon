const BaseAction = require("./base_action")

class Sleep extends BaseAction {

  perform(options) {
    this.planner.sector.registerSleeping({
      entity: this.planner.entity, 
      finished: this.onSleepingFinished.bind(this),
      progress: 0,
      bed: options.bed
    })

    this.bed = options.bed

    options.bed.interact(this.planner.entity)

    this.planner.entity.setDormant(true)
  }

  getBehaviorName() {
    return "Sleep"
  }

  onSleepingFinished(entity) {
    entity.setDormant(false)
    entity.wakeup()

    this.bed.unclaim()

    this.complete()
  }

}

module.exports = Sleep