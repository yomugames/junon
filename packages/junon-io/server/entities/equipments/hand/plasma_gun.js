const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")
const SocketUtil = require("junon-common/socket_util")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class PlasmaGun extends HandEquipment {

  use(user, targetEntity) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("PlasmaCell Required")
        return false
      }

      ammo.reduceCount(1)
    }

    super.use(user, targetEntity)

    let sourcePoint = user.game.pointFromDistance(user.getX(), user.getY(), Constants.tileSize * 4, user.getRadAngle())

    const projectile = new Projectiles.PlasmaBullet({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: user.getShootTarget(this)
    })

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
