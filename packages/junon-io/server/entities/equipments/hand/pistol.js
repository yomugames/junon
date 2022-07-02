const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Pistol extends HandEquipment {

  use(user, targetEntity) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("Bullet Ammo Required")
        return false
      }

      ammo.reduceCount(1)
    }

    super.use(user, targetEntity)

    let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), 48, user.getRadAngle())

    const projectile = new Projectiles.Bullet({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: user.getShootTarget(this)
    })

    return true
  }

  getConstantsTable() {
    return "Equipments.Pistol"
  }

  getAmmoType() {
    return Protocol.definition().BuildingType.BulletAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.Pistol
  }
}

module.exports = Pistol
