const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const SteelFloor = require("./steel_floor")

class Hangar extends SteelFloor {

  onBuildingPlaced() {
    super.onBuildingPlaced()
    this.container.hangars[this.id] = this
  }

  unregister() {
    super.unregister()
    delete this.container.hangars[this.id]
  }

  partitionRoom() {
    // do nothing
  }

  isHangar() {
    return true
  }

  getConstantsTable() {
    return "Buildings.Hangar"
  }

  getType() {
    return Protocol.definition().BuildingType.Hangar
  }

}


module.exports = Hangar

