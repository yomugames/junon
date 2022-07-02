const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Mountable = require('../../interfaces/mountable')

class UndergroundVent extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.sector.addUndergroundVent(this)
    this.initMountable()
  }

  interact(user) {
    if (!this.isAllowedToUse(user)) {
      user.showError("Permission Denied")
      return
    }

    if (user.currentVent === this) {
      this.unhideFromVent(user)
    } else {
      this.hideInVent(user)
    }
  }

  unhideFromVent(user) {
    user.setCurrentVent(null)
    user.setMounted(null)

    user.setHidden(false)
    user.setDormant(false)
  }

  hideInVent(user) {
    if (!this.isAllowedToUse(user)) return

    user.setCurrentVent(this)
    user.setMounted(this)

    user.setHidden(true)
    user.setDormant(true)
    user.setPosition(this.getX(), this.getY())
    user.stopMoving()
  }

  remove() {
    super.remove()
    this.sector.removeUndergroundVent(this)

    this.game.forEachPlayer((player) => {
      if (player.currentVent === this) {
        this.unhideFromVent(player)
        player.setMounted(null)
      }

    })
  }

  isAllowedToUse(entity) {
    if (!entity.isPlayer()) return true
    if (entity.isSectorOwner()) return true

    if (this.isCustomAccess) {
      return this.isRolePermitted(entity.roleType)
    } else {
      return entity.getRole().isAllowedTo("UseVents")
    }
  }

  getConstantsTable() {
    return "Buildings.UndergroundVent"
  }

  getType() {
    return Protocol.definition().BuildingType.UndergroundVent
  }

}

Object.assign(UndergroundVent.prototype, Mountable.prototype, {
  shouldUpdatePosition() {
    return false
  }
})

module.exports = UndergroundVent
