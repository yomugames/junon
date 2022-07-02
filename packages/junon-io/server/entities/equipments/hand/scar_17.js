
const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")
const SocketUtil = require("junon-common/socket_util")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const AssaultRifle = require("./assault_rifle")


class Scar17 extends AssaultRifle {
  getConstantsTable() {
    return "Equipments.Scar17"
  }

  getAmmoType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.Scar17
  }
}

module.exports = Scar17