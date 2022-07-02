const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Foods = require("./../foods/index")
const Ores = require("./../ores/index")
const Equipments = require("./../equipments/index")

class Brewery extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Brewery"
  }

  getType() {
    return Protocol.definition().BuildingType.Brewery
  }

  canCraft(type) {
    if (this.isFull()) return false

    const templateList = [Foods.FirstAidKit, Foods.Antidote, Ores.NitroPowder, Equipments.Syringe]

    return templateList.find((klass) => { klass.getType() === type })
  }

  craft(item, inventoryInput) {
    if (!this.hasMetPowerRequirement()) return

    const isSuccessful = item.craft(inventoryInput)
    if (isSuccessful) {
      this.store(item)
    }

    return isSuccessful
  }

}

module.exports = Brewery

