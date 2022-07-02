const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class Shotgun extends HandEquipment {

  use(user, targetEntity) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("Shotgun Shells Required")
        return false
      }

      ammo.reduceCount(1)
    }

    super.use(user, targetEntity)

    let angles = [-7, -2, 3, 8]
    angles.forEach((angle) => {
      let angleInRad = user.getRadAngle() + (angle * Math.PI / 180)

      new Projectiles.ShotgunBullet({
        weapon:        this,
        source:      { x: user.getX(),         y: user.getY() },
        destination: user.getShootTarget(this, angleInRad)
      })
    })

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
