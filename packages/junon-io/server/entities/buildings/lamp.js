const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Lamp extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (typeof this.isOpen === 'undefined') {
      this.open()
    }
  }

  setBuildingContent(content, player) {
    super.setBuildingContent(content, player)

    if (player) {
      player.setLastLampContent(content)
    }
  }

  interact(user) {
    if (!this.hasMetPowerRequirement()) return

    if (!user.hasMemberPrivilege()) return

    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  open() {
    this.isOpen = true
    this.onOpenStateChanged()
  }

  close() {
    this.isOpen = false
    this.onOpenStateChanged()
  }

  getConstantsTable() {
    return "Buildings.Lamp"
  }

  getType() {
    return Protocol.definition().BuildingType.Lamp
  }
}


module.exports = Lamp

