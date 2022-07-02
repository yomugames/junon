const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")
const SocketUtil = require("junon-common/socket_util")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class SquidStaff extends HandEquipment {

  use(user, targetEntity) {
    super.use(user, targetEntity)

    let angles = [-30, -15, 0, 15, 30]
    angles.forEach((angle) => {
      let angleInRad = user.getRadAngle() + (angle * Math.PI / 180)
      const projectile = new Projectiles.Bubble({
        weapon:        this,
        source:      { x: user.getX(),         y: user.getY() },
        destination: user.getShootTarget(this, angleInRad)
      })
    })

    return true
  }

  getConstantsTable() {
    return "Equipments.SquidStaff"
  }

  getType() {
    return Protocol.definition().BuildingType.SquidStaff
  }
}

module.exports = SquidStaff
