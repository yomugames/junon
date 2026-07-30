const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Minigun extends RangeEquipment {
  getProjectileBiasByY() {
    return super.getProjectileBiasByY() + super.getProjectileBiasByY() * (Math.random() - 0.5)
  }
  
  getProjectileType() {
    return Projectiles.MinigunBullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.Minigun"
  }
  
  getAmmoType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.Minigun
  }
}

module.exports = Minigun
