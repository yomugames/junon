const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')

// Reporting bodies with the radio belonged to the removed Find the Imposter
// minigame; the item remains so saves that contain it still load.
class Radio extends HandEquipment {
  getType() {
    return Protocol.definition().BuildingType.Radio
  }

  getConstantsTable() {
    return "Equipments.Radio"
  }
}

module.exports = Radio
