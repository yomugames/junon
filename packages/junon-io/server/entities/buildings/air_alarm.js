const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class AirAlarm extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.checkAir()
  }

  onNetworkAssignmentChanged(networkName) {
    if (networkName === "room") {
      if (this.room) {
        this.room.checkOxygenLevels()
        this.checkAir()
      }
    }
  }

  onRoomOxygenatedChanged() {
    this.checkAir()
  }

  checkAir() {
    if (!this.room) {
      this.setOpen(true)
      return
    }

    if (!this.room.isOxygenated) {
      this.setOpen(true)
    } else {
      this.setOpen(false)
    }
  }

  setOpen(isOpen) {
    if (this.isOpen !== isOpen) {
      this.isOpen = isOpen
      this.onOpenStateChanged()
    }
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }

  getConstantsTable() {
    return "Buildings.AirAlarm"
  }

  getType() {
    return Protocol.definition().BuildingType.AirAlarm
  }

}

module.exports = AirAlarm

