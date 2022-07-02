const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Airlock = require("./airlock")
const Team = require("../team")

class SealedDoor extends Airlock {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.setIsCustomAccess(true)
  }

  getDefaultAccessType() {
    let result = 0

    result += (1 << Team.SlaveRoleType)

    if (this.owner && this.owner.isTeam()) {
      for (let id in this.owner.roles) {
        result += (1 << parseInt(id))
      }
    }

    return result
  }

  getConstantsTable() {
    return "Buildings.SealedDoor"
  }

  getType() {
    return Protocol.definition().BuildingType.SealedDoor
  }

  isAutomatic() {
    return false
  }

  interact(user) {
    if (!this.isAllowedToPass(user)) {
      user.showError("Access Denied")
      return
    }

    super.interact(user)
  }

  canBeSalvagedBy(player) {
    if (player.isAdmin() || player.isSectorOwner()) {
      return super.canBeSalvagedBy(player)
    } else {
      return false
    }
  }

  isAllowedToPass(entity) {
    if (!this.isOwnedBy(entity)) return false
      
    if (entity.isPlayer()) {
      return this.isRolePermitted(entity.roleType)
    } else if (entity.hasCategory("worker")) {
      return this.isRolePermitted(Team.SlaveRoleType)
    } else {
      return true
    }
  }

  shouldObstruct(body, hit) {
    // if (!this.isAllowedToPass(body.entity)) return true

    return !this.isOpen
  }


}

module.exports = SealedDoor
