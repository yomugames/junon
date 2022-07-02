const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class RocketLauncher extends HandEquipment {

  use(user, targetEntity) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("Missile Required")
        return false
      }

      ammo.reduceCount(1)
    }

    super.use(user, targetEntity)

    let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), Constants.tileSize, user.getRadAngle())

    const projectile = new Projectiles.Missile({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: user.getShootTarget(this),
      shouldCreateExplosion: true,
      shouldAttackBuildings: true
    })

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
