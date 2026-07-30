const RangeEquipment = require("./range_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class Shotgun extends RangeEquipment {
  usesShellOrMagazine() {
    return true
  }
  
  getProjectileType() {
    return Projectiles.ShotgunBullet
  }

  use(user, targetEntity) {
    super.use(user, targetEntity)
    
    return true
  }

  getConstantsTable() {
    return "Equipments.Shotgun"
  }

  getAmmoType() {
    return Protocol.definition().BuildingType.ShotgunShell
  }

  getType() {
    return Protocol.definition().BuildingType.Shotgun
  }
}

module.exports = Shotgun
