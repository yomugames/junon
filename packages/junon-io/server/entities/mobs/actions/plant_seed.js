const BaseAction = require("./base_action")
const Item = require("../../item")
const Buildings = require("../../buildings/index")

class PlantSeed extends BaseAction {
  perform(options) {
    let buildingKlass = Buildings.forType(options.seed.type)

    let data = {
      angle: -90,
      x: options.soil.getX(),
      y: options.soil.getY(),
      owner: this.planner.entity.getOwner()
    }

    buildingKlass.build(data, options.soil.getContainer())

    options.seed.consume()
  }

  shouldCompleteAfterPerform() {
    return true
  }

}

module.exports = PlantSeed