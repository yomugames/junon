const RangeEquipment = require("./range_equipment")
const Projectiles = require("../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class MiasmaGun extends RangeEquipment {
  getProjectileType() {
    return Projectiles.MiasmaBullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.MiasmaGun"
  }
  
  checkForAmmo(user) {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.MiasmaGun
  }
}

module.exports = MiasmaGun
