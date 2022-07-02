const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Dismantler extends HandEquipment {
  use(player, targetEntity) {
    if (targetEntity && targetEntity.isBuilding() ) {
      let isOwnedByOtherPlayer = targetEntity.owner && targetEntity.owner !== player
      // if (isOwnedByOtherPlayer) {
      //   player.showError("Cannot remove structures you don't own")
      // } else {
      targetEntity.dismantle()
      // }
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Dismantler
  }

  getConstantsTable() {
    return "Equipments.Dismantler"
  }

}

module.exports = Dismantler
