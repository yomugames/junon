const RangeEquipment = require("./range_equipment")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class Deconstructor extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 35
    this.sprite.position.y = 10
  }
  
  getSpritePath() {
    return 'deconstructor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Deconstructor
  }

  getConstantsTable() {
    return "Equipments.Deconstructor"
  }

  

}

module.exports = Deconstructor
