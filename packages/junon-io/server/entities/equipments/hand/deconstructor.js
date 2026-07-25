const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Deconstructor extends RangeEquipment {
  checkForAmmo(user) {
    return true
  }
  
  getProjectileType() {
    return Projectiles.BlueLaser
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.Deconstructor"
  }

  getType() {
    return Protocol.definition().BuildingType.Deconstructor
  }
}

module.exports = Deconstructor
