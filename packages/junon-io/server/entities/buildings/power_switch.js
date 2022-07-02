const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class PowerSwitch extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (typeof this.isOpen === 'undefined') {
      this.isOpen = true
    }
  }

  interact(user) {
    if (!user.hasMemberPrivilege()) return
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  open() {
    this.isOpen = true

    if (this.getPowerNetwork()) {
      this.forEachSwitchableConsumers((entity) => {
        entity.open()
      })
    }

    this.onOpenStateChanged()
  }

  forEachSwitchableConsumers(cb) {
    for (let id in this.getPowerNetwork().consumers) {
      let hit = this.getPowerNetwork().consumers[id]
      let entity = hit.entity
      if (entity.hasCategory("switch")) {
        cb(entity)
      }
    }
  }

  close() {
    this.isOpen = false

    if (this.getPowerNetwork()) {
      this.forEachSwitchableConsumers((entity) => {
        entity.close()
      })
    }

    this.onOpenStateChanged()
  }


  getConstantsTable() {
    return "Buildings.PowerSwitch"
  }

  getType() {
    return Protocol.definition().BuildingType.PowerSwitch
  }
  
}


module.exports = PowerSwitch

