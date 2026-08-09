const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class RocketLauncher extends RangeEquipment {
  getProjectileType() {
    return Projectiles.Missile
  }
  
  constructProjectileData(data) {
    let projectileData = super.constructProjectileData(data)
    
    projectileData.shouldCreateExplosion = true,
    projectileData.shouldAttackBuildings = true
    
    return projectileData
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.RocketLauncher"
  }

  getAmmoType() {
    return Protocol.definition().BuildingType.Missile
  }

  getType() {
    return Protocol.definition().BuildingType.RocketLauncher
  }
}

module.exports = RocketLauncher
