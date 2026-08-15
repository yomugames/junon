const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class HeavyRifle extends RangeEquipment {
  getProjectileType() {
    return Projectiles.RifleBullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.HeavyRifle"
  }
  
  getAmmoType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.HeavyRifle
  }
}

module.exports = HeavyRifle
