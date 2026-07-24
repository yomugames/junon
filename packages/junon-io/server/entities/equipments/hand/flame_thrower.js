const RangeEquipment = require("./range_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class FlameThrower extends RangeEquipment {
  checkForAmmo(user) {
    if (this.isDepleted() && !user.hasInfiniteAmmo()) {
      let owner = this.getOwner()
      if (owner.isPlayer()) {
        owner.showError("Needs Fuel")
      }

      return false
    }
    return true
  }

  getProjectileType() {
    return Projectiles.Flame
  }

  use(player, targetEntity) {

    super.use(player, targetEntity)
  }

  onEquipmentConstructed() {
    this.setUsage(0)
  }

  getType() {
    return Protocol.definition().BuildingType.FlameThrower
  }

  getConstantsTable() {
    return "Equipments.FlameThrower"
  }
}

module.exports = FlameThrower
