/*
http://alumni.media.mit.edu/~jorkin/GOAP_draft_AIWisdom2_2003.pdf
http://alumni.media.mit.edu/~jorkin/gdc2006_orkin_jeff_fear.pdf
*/

const ExceptionReporter = require('junon-common/exception_reporter')

class BaseAction {

  static perform(planner, options = {}) {
    let result
    let game = planner.game

    try {
      result = this.setup(planner, options)
      if (!result) return false
      result = Object.assign({}, result, options)
    } catch(e) {
      game.captureException(e)
      return false
    }

    let action = new this()

    try {
      action.planner = planner
      action.planner.entity.isWandering = false
      planner.setCurrentAction(action)
      action.options = options

      let behaviorName = action.getBehaviorName()
      if (behaviorName) {
        action.planner.entity.setBehaviorByName(behaviorName)
      }

      action.perform(result)

      if (action.shouldCompleteAfterPerform()) {
        action.complete()
      }

      return true
    } catch(e) {
      game.captureException(e)
      action.complete()
      return false
    }
  }

  static setup(planner) {
    return {}
  }

  canPerform(planner) {
    return false
  }

  getBehaviorName() {
  }

  complete() {
    this.planner.entity.setBehaviorByName("Idle")
    this.planner.entity.isWandering = true
    this.planner.setCurrentAction(null)
  }

  shouldCompleteAfterPerform() {
    return false
  }

  onDragTargetRemoved() {
    // do nothing by default
  }


}

module.exports = BaseAction
