const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const LOG = require('junon-common/logger')

class EscapePod extends BaseBuilding {

  isOnLobbyStation() {
    return this.owner && this.owner.id === 1
  }

  getInitialItems() {
    return ["Potato:5", "PotatoSeed:3"]
  }

  unregister() {
    super.unregister()
  }

  getConstantsTable() {
    return "Buildings.EscapePod"
  }

  getType() {
    return Protocol.definition().BuildingType.EscapePod
  }

  remove() {
    super.remove()
    if (this.owner && this.owner.initialEscapePod === this) {
      this.owner.initialEscapePod = null
    }
  }

  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)

    if (this.isEmpty()) {
      this.getPlacer() && this.getPlacer().progressTutorial("main", 0)
    }
  }

}

module.exports = EscapePod
