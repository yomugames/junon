const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Uzi extends RangeEquipment {
  getProjectileType() {
    return Projectiles.Bullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.Uzi"
  }
  
  getAmmoType() {
    return Protocol.definition().BuildingType.BulletAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.Uzi
  }
}

module.exports = Uzi
