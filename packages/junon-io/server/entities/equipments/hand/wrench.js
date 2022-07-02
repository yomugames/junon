const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class Wrench extends HandEquipment {
  use(player, targetEntity) {
    if (targetEntity && targetEntity.isRepairable()) {
      player.setRepairTarget(targetEntity)
      player.setIsAngleLocked(true)
    } 

    super.use(player, targetEntity)
  }

  getType() {
    return Protocol.definition().BuildingType.Wrench
  }

  getConstantsTable() {
    return "Equipments.Wrench"
  }
}

module.exports = Wrench
