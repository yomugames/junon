const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class GrenadeLauncher extends RangeEquipment {
  getProjectileType() {
    return Projectiles.Grenade
  }
  
  constructProjectileData(data) {
    const projectileData = super.constructProjectileData(data)
    
    projectileData.countdown = 1.75
    
    return projectileData
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)

    return true
  }

  getConstantsTable() {
    return "Equipments.GrenadeLauncher"
  }
  
  getAmmoType() {
    return Protocol.definition().BuildingType.Grenade
  }

  getType() {
    return Protocol.definition().BuildingType.GrenadeLauncher
  }
}

module.exports = GrenadeLauncher
