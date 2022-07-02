const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const ShipBuilding = require("./ship_building")

class Bridge extends ShipBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.container.bridge = this
  }

  interact(user) {
    let ship = this.container

    // validate ownership
    if (user.isPilot) {
      user.unsetPilot(user)
    } else {
      user.setPilot(user)
    }
  }

  unregister() {
    super.unregister()
  }

  getConstantsTable() {
    return "Buildings.Bridge"
  }

  getType() {
    return Protocol.definition().BuildingType.Bridge
  }

  isBridge() {
    return true
  }

  executeTurn() {
    this.updateRbushCoords()
    return

    const playerList = this.sector.playerTree.search(this.getBoundingBox())
    playerList.forEach((player) => {
      this.dockPlayer(player)
    })


    // see if player no longer in docking bay
    for (let playerId in this.playersFound) {
      let player = this.playersFound[playerId]
      let isPlayerNoLongerPresent = playerList.indexOf(player) === -1
      if (isPlayerNoLongerPresent) {
        delete this.playersFound[player.id]
      }
    }
  }


}

module.exports = Bridge
