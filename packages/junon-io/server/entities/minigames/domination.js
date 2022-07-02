const BaseMiniGame = require("./base_minigame")
const Protocol = require('../../../common/util/protocol')

class Domination extends BaseMiniGame {
  registerHandlers(eventHandler) {
    this.REQUIRED_PLAYER_COUNT = 1
    this.MAX_PLAYER_COUNT = 20

    eventHandler.restartCooldown = 15 * 1000

    this.initMain(eventHandler)
  }

  initMain(eventHandler) {

  }

  shouldSendFullMap() {
    return false
  }

  canCraftItem(type) {
    if (type === Protocol.definition().BuildingType.Beacon) {
      return false
    }
    return true
  }


  shouldImportCommandBlock() {
    return true
  }

  getMaxPlayers() {
    return 20
  }

  canRespawn(player) {
    return true
  }

  canCraft() {
    return true
  }

}

module.exports = Domination