const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class PlasmaGun extends RangeEquipment {
  getProjectileType() {
    return Projectiles.PlasmaBullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.PlasmaGun"
  }
  
  getAmmoType() {
    return Protocol.definition().BuildingType.PlasmaCell
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaGun
  }
}

module.exports = PlasmaGun
