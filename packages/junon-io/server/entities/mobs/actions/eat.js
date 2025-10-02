const BaseAction = require("./base_action")
const Protocol = require('../../../../common/util/protocol')
class Eat extends BaseAction {

  static setup(planner) {
    let item = planner.entity.getHandItem()
    if (!item) return false
    if (!item.isFood()) return false

    return { food: item }
  }

  perform(options) {
    this.planner.sector.registerEating({
      entity: this.planner.entity, 
      food: options.food, 
      finished: this.onEatingFinished.bind(this),
      progress: 0
    })

    this.planner.entity.setDormant(true)
  }

  getBehaviorName() {
    return "Eat"
  }

  onEatingFinished(food, entity) {
    if(entity.constructor.name === "Visitor" && Protocol.definition().BuildingType[food.type] === "SlimyMeatPizza") entity.Happiness.changeHappinessForEvent("eatSlimyMeatPizza")
    food.use(entity)
    entity.setDormant(false)
    this.complete()
  }

}

module.exports = Eat