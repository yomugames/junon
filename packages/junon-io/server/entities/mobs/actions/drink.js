const BaseAction = require("./base_action")

class Eat extends BaseAction {

  static setup(planner) {
    let item = planner.entity.getHandItem()
    if (!item) return false
    if (!item.isDrink()) return false

    return { drink: item }
  }

  perform(options) {
    this.planner.sector.registerEating({
      entity: this.planner.entity, 
      food: options.drink, 
      finished: this.onDrinkingFinished.bind(this),
      progress: 0
    })

    this.planner.entity.setDormant(true)
  }

  getBehaviorName() {
    return "Drink"
  }

  onDrinkingFinished(drink, entity) {
    drink.use(entity)
    entity.setDormant(false)
    entity.Happiness.changeHappinessForEvent("drinkBeer")
    this.complete()
  }

}

module.exports = Eat